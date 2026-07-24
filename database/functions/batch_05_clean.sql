CREATE OR REPLACE FUNCTION admin_verify_recording(
    p_recording_id UUID,
    p_verify BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_recording recordings;
BEGIN
    IF NOT is_admin() THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'الوصول مقيد بالمشرفين',
            'errors', jsonb_build_array('forbidden')
        );
    END IF;

    IF p_recording_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'معرف التسجيل مطلوب',
            'errors', jsonb_build_array('missing_recording_id')
        );
    END IF;

    SELECT * INTO v_recording FROM recordings WHERE id = p_recording_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'التسجيل غير موجود',
            'errors', jsonb_build_array('recording_not_found')
        );
    END IF;

    IF p_verify THEN
        UPDATE recordings
        SET is_verified = true, verified_by = auth.uid(), verified_at = now()
        WHERE id = p_recording_id
        RETURNING * INTO v_recording;
    ELSE
        UPDATE recordings
        SET is_verified = false, verified_by = NULL, verified_at = NULL
        WHERE id = p_recording_id
        RETURNING * INTO v_recording;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', v_recording.id,
            'is_verified', v_recording.is_verified,
            'verified_by', v_recording.verified_by,
            'verified_at', v_recording.verified_at
        ),
        'message', CASE WHEN p_verify THEN 'تم اعتماد التسجيل ✅' ELSE 'تم سحب الاعتماد' END,
        'errors', jsonb_build_array()
    );
END;
$$;


CREATE OR REPLACE FUNCTION admin_list_recordings_queue(
    p_status report_status DEFAULT 'open',
    p_limit INT DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION admin_resolve_report(
    p_report_id UUID,
    p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_report reports;
    v_message TEXT;
    v_recording_id UUID;
    v_file_path TEXT;
BEGIN
    IF NOT is_admin() THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'الوصول مقيد بالمشرفين',
            'errors', jsonb_build_array('forbidden')
        );
    END IF;

    IF p_action NOT IN ('dismiss', 'hide', 'delete_recording', 'restore') THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'إجراء غير معروف — استخدم dismiss, hide, delete_recording, أو restore',
            'errors', jsonb_build_array('invalid_action')
        );
    END IF;

    SELECT * INTO v_report FROM reports WHERE id = p_report_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'البلاغ غير موجود',
            'errors', jsonb_build_array('report_not_found')
        );
    END IF;

    v_recording_id := v_report.recording_id;

    CASE p_action
        WHEN 'dismiss' THEN
            UPDATE reports SET status = 'dismissed', resolved_by = auth.uid(), resolved_at = now()
            WHERE id = p_report_id;
            v_message := 'تم رفض البلاغ';

        WHEN 'hide' THEN
            UPDATE recordings SET is_hidden = true, hidden_reason = 'admin_manual' WHERE id = v_recording_id;
            UPDATE reports SET status = 'resolved', resolved_by = auth.uid(), resolved_at = now()
            WHERE id = p_report_id;
            v_message := 'تم إخفاء التسجيل';

        WHEN 'delete_recording' THEN
            SELECT file_path INTO v_file_path FROM recordings WHERE id = v_recording_id;
            DELETE FROM recordings WHERE id = v_recording_id;
            UPDATE reports SET status = 'resolved', resolved_by = auth.uid(), resolved_at = now()
            WHERE id = p_report_id;
            v_message := 'تم حذف التسجيل';

        WHEN 'restore' THEN
            UPDATE recordings SET is_hidden = false, hidden_reason = NULL WHERE id = v_recording_id;
            UPDATE reports SET status = 'dismissed', resolved_by = auth.uid(), resolved_at = now()
            WHERE recording_id = v_recording_id AND status IN ('open', 'reviewing');
            v_message := 'تم استرجاع التسجيل';
    END CASE;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'action', p_action,
            'recording_id', v_recording_id,
            'file_path', v_file_path
        ),
        'message', v_message,
        'errors', jsonb_build_array()
    );
END;
$$;


CREATE OR REPLACE FUNCTION admin_resolve_content_report(
    p_report_id UUID,
    p_status content_report_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_report content_reports;
BEGIN
    IF NOT is_admin() THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'الوصول مقيد بالمشرفين',
            'errors', jsonb_build_array('forbidden')
        );
    END IF;

    IF p_status NOT IN ('in_progress', 'resolved', 'dismissed') THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'حالة غير معروفة — استخدم in_progress, resolved, أو dismissed',
            'errors', jsonb_build_array('invalid_status')
        );
    END IF;

    SELECT * INTO v_report FROM content_reports WHERE id = p_report_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'بلاغ المحتوى غير موجود',
            'errors', jsonb_build_array('content_report_not_found')
        );
    END IF;

    UPDATE content_reports
    SET status = p_status, resolved_by = auth.uid(), resolved_at = now()
    WHERE id = p_report_id
    RETURNING * INTO v_report;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', v_report.id,
            'status', v_report.status,
            'resolved_by', v_report.resolved_by,
            'resolved_at', v_report.resolved_at
        ),
        'message', 'تم تحديث حالة بلاغ المحتوى',
        'errors', jsonb_build_array()
    );
END;
$$;


CREATE OR REPLACE FUNCTION admin_update_setting(
    p_key TEXT,
    p_value JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_setting app_settings;
BEGIN
    IF NOT is_admin() THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'الوصول مقيد بالمشرفين',
            'errors', jsonb_build_array('forbidden')
        );
    END IF;

    -- Validate key exists
    IF NOT EXISTS (SELECT 1 FROM app_settings WHERE key = p_key) THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'مفتاح إعداد غير معروف',
            'errors', jsonb_build_array('unknown_setting_key')
        );
    END IF;

    -- Validate value based on key
    CASE p_key
        WHEN 'upload_enabled' THEN
            IF p_value NOT IN ('true'::jsonb, 'false'::jsonb) THEN
                RETURN jsonb_build_object('success', false, 'data', NULL, 'message', 'قيمة غير صالحة لهذا الإعداد — يجب أن تكون true أو false', 'errors', jsonb_build_array('invalid_value'));
            END IF;
        WHEN 'report_alert_ratio' THEN
            IF (p_value #>> '{}')::numeric <= 0 OR (p_value #>> '{}')::numeric > 1 THEN
                RETURN jsonb_build_object('success', false, 'data', NULL, 'message', 'قيمة غير صالحة — يجب أن تكون بين 0 و 1', 'errors', jsonb_build_array('invalid_value'));
            END IF;
        WHEN 'report_alert_min' THEN
            IF (p_value #>> '{}')::int < 1 THEN
                RETURN jsonb_build_object('success', false, 'data', NULL, 'message', 'قيمة غير صالحة — يجب أن تكون 1 على الأقل', 'errors', jsonb_build_array('invalid_value'));
            END IF;
        WHEN 'report_hide_ratio' THEN
            IF (p_value #>> '{}')::numeric <= 0 OR (p_value #>> '{}')::numeric > 1 THEN
                RETURN jsonb_build_object('success', false, 'data', NULL, 'message', 'قيمة غير صالحة — يجب أن تكون بين 0 و 1', 'errors', jsonb_build_array('invalid_value'));
            END IF;
        WHEN 'report_hide_min' THEN
            IF (p_value #>> '{}')::int < 1 THEN
                RETURN jsonb_build_object('success', false, 'data', NULL, 'message', 'قيمة غير صالحة — يجب أن تكون 1 على الأقل', 'errors', jsonb_build_array('invalid_value'));
            END IF;
        WHEN 'community_best_min_likes' THEN
            IF (p_value #>> '{}')::int < 0 THEN
                RETURN jsonb_build_object('success', false, 'data', NULL, 'message', 'قيمة غير صالحة — يجب أن تكون 0 أو أكثر', 'errors', jsonb_build_array('invalid_value'));
            END IF;
        WHEN 'active_users_window_days' THEN
            IF (p_value #>> '{}')::int < 1 OR (p_value #>> '{}')::int > 365 THEN
                RETURN jsonb_build_object('success', false, 'data', NULL, 'message', 'قيمة غير صالحة — يجب أن تكون بين 1 و 365', 'errors', jsonb_build_array('invalid_value'));
            END IF;
        WHEN 'rate_limit_uploads_per_hour' THEN
            IF (p_value #>> '{}')::int < 1 OR (p_value #>> '{}')::int > 100 THEN
                RETURN jsonb_build_object('success', false, 'data', NULL, 'message', 'قيمة غير صالحة — يجب أن تكون بين 1 و 100', 'errors', jsonb_build_array('invalid_value'));
            END IF;
        WHEN 'listen_count_threshold_seconds' THEN
            IF (p_value #>> '{}')::int < 1 OR (p_value #>> '{}')::int > 60 THEN
                RETURN jsonb_build_object('success', false, 'data', NULL, 'message', 'قيمة غير صالحة — يجب أن تكون بين 1 و 60', 'errors', jsonb_build_array('invalid_value'));
            END IF;
        ELSE
            RETURN jsonb_build_object(
                'success', false, 'data', NULL,
                'message', 'مفتاح إعداد غير معروف',
                'errors', jsonb_build_array('unknown_setting_key')
            );
    END CASE;

    -- Update setting
    UPDATE app_settings
    SET value = p_value, updated_by = auth.uid(), updated_at = now()
    WHERE key = p_key
    RETURNING * INTO v_setting;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'key', v_setting.key,
            'value', v_setting.value,
            'updated_by', v_setting.updated_by,
            'updated_at', v_setting.updated_at
        ),
        'message', 'تم حفظ الإعداد',
        'errors', jsonb_build_array()
    );
END;
$$;
