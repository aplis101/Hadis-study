CREATE OR REPLACE FUNCTION admin_list_recordings_queue(
    p_status report_status DEFAULT 'open',
    p_limit INT DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_queue JSONB;
    v_total INT;
BEGIN
    IF NOT is_admin() THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'الوصول مقيد بالمشرفين',
            'errors', jsonb_build_array('forbidden')
        );
    END IF;

    WITH report_stats AS (
        SELECT
            r.recording_id,
            r.status,
            COUNT(*) AS report_count,
            array_agg(DISTINCT r.reason)::TEXT[] AS reasons,
            MIN(r.created_at) AS oldest_report_at
        FROM reports r
        WHERE r.status = p_status
        GROUP BY r.recording_id, r.status
    ),
    ranked AS (
        SELECT
            rs.recording_id,
            rec.hadith_id,
            LEFT(h.matn_ar, 100) AS hadith_excerpt,
            p.display_name AS owner_display_name,
            p.id AS owner_id,
            rs.report_count,
            rs.reasons,
            rec.is_hidden,
            rec.is_verified,
            rs.oldest_report_at
        FROM report_stats rs
        JOIN recordings rec ON rec.id = rs.recording_id
        JOIN hadiths h ON h.id = rec.hadith_id
        JOIN profiles p ON p.id = rec.user_id
        ORDER BY rs.report_count DESC, rs.oldest_report_at ASC
        LIMIT p_limit
    )
    SELECT
        COALESCE(jsonb_agg(jsonb_build_object(
            'recording_id', r.recording_id,
            'hadith_id', r.hadith_id,
            'hadith_excerpt', r.hadith_excerpt,
            'owner_real_name', (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = r.owner_id),
            'owner_email', (SELECT email FROM auth.users WHERE id = r.owner_id),
            'owner_display_name', r.owner_display_name,
            'report_count', r.report_count,
            'reasons', r.reasons,
            'is_hidden', r.is_hidden,
            'is_verified', r.is_verified,
            'oldest_report_at', r.oldest_report_at
        )), '[]'::jsonb),
        COUNT(*) OVER() AS total_count
    INTO v_queue, v_total
    FROM ranked r;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'queue', COALESCE(v_queue, '[]'::jsonb)
        ),
        'message', 'نجاح',
        'errors', jsonb_build_array()
    );
END;
$$;
