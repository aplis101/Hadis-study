CREATE OR REPLACE FUNCTION submit_content_report(
    p_hadith_id UUID,
    p_error_type content_error_type,
    p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_report content_reports;
BEGIN
    -- Validate input
    IF p_error_type IS NULL OR p_description IS NULL OR p_description = '' THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'نوع الخطأ والوصف مطلوبان',
            'errors', jsonb_build_array('missing_required_fields')
        );
    END IF;

    IF char_length(p_description) > 1000 THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'الوصف يتجاوز 1000 حرف',
            'errors', jsonb_build_array('description_too_long')
        );
    END IF;

    -- Authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'يجب تسجيل الدخول أولاً',
            'errors', jsonb_build_array('not_authenticated')
        );
    END IF;

    -- Validate hadith exists
    IF NOT EXISTS (SELECT 1 FROM hadiths WHERE id = p_hadith_id) THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'الحديث غير موجود',
            'errors', jsonb_build_array('hadith_not_found')
        );
    END IF;

    -- Insert content report (no threshold evaluation)
    INSERT INTO content_reports (hadith_id, reporter_id, error_type, description)
    VALUES (p_hadith_id, v_user_id, p_error_type, p_description)
    RETURNING * INTO v_report;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', v_report.id,
            'hadith_id', v_report.hadith_id,
            'error_type', v_report.error_type,
            'description', v_report.description,
            'status', v_report.status,
            'created_at', v_report.created_at
        ),
        'message', 'وصل بلاغك عن المحتوى للإدارة',
        'errors', jsonb_build_array()
    );
END;
$$;
