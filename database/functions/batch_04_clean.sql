CREATE OR REPLACE FUNCTION submit_report(
    p_recording_id UUID,
    p_reason report_reason,
    p_details TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_report_id UUID;
    v_report_count INT;
    v_active_students INT;
    v_alert_ratio NUMERIC;
    v_alert_min INT;
    v_hide_ratio NUMERIC;
    v_hide_min INT;
    v_alert_threshold INT;
    v_hide_threshold INT;
    v_threshold_result TEXT;
    v_is_hidden BOOLEAN;
BEGIN
    -- Authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'يجب تسجيل الدخول أولاً',
            'errors', jsonb_build_array('not_authenticated')
        );
    END IF;

    -- Validate recording exists
    IF NOT EXISTS (SELECT 1 FROM recordings WHERE id = p_recording_id) THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'التسجيل غير موجود',
            'errors', jsonb_build_array('recording_not_found')
        );
    END IF;

    -- Check duplicate (recording_id, reporter_id UNIQUE)
    IF EXISTS (SELECT 1 FROM reports WHERE recording_id = p_recording_id AND reporter_id = v_user_id) THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'لقد أبلغت عن هذا التسجيل مسبقاً',
            'errors', jsonb_build_array('duplicate_report')
        );
    END IF;

    -- Validate details length
    IF p_details IS NOT NULL AND char_length(p_details) > 500 THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'التفاصيل تتجاوز 500 حرف',
            'errors', jsonb_build_array('details_too_long')
        );
    END IF;

    -- Insert report
    INSERT INTO reports (recording_id, reporter_id, reason, details)
    VALUES (p_recording_id, v_user_id, p_reason, p_details)
    RETURNING id INTO v_report_id;

    -- Evaluate thresholds (ALG-002)
    v_alert_ratio := get_setting_numeric('report_alert_ratio', 0.15);
    v_alert_min := get_setting_int('report_alert_min', 2);
    v_hide_ratio := get_setting_numeric('report_hide_ratio', 0.40);
    v_hide_min := get_setting_int('report_hide_min', 4);

    SELECT COUNT(*) INTO v_active_students
    FROM get_active_students_count();

    SELECT COUNT(*) INTO v_report_count
    FROM reports
    WHERE recording_id = p_recording_id AND status IN ('open', 'reviewing');

    v_alert_threshold := GREATEST(v_alert_min, CEIL(v_active_students * v_alert_ratio)::INT);
    v_hide_threshold := GREATEST(v_hide_min, CEIL(v_active_students * v_hide_ratio)::INT);

    SELECT is_hidden INTO v_is_hidden FROM recordings WHERE id = p_recording_id;

    IF v_report_count >= v_hide_threshold AND NOT v_is_hidden THEN
        UPDATE recordings SET is_hidden = true, hidden_reason = 'auto_hidden_threshold' WHERE id = p_recording_id;
        v_threshold_result := 'hidden';
    ELSIF v_report_count >= v_alert_threshold THEN
        v_threshold_result := 'alerted';
    ELSE
        v_threshold_result := 'none';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'report_id', v_report_id,
            'threshold_result', v_threshold_result
        ),
        'message', 'وصل بلاغك للإدارة، شكراً لك',
        'errors', jsonb_build_array()
    );
END;
$$;


CREATE OR REPLACE FUNCTION submit_content_report(
    p_hadith_id UUID,
    p_error_type content_error_type,
    p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION give_upload_consent()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_consent_given_at TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'يجب تسجيل الدخول أولاً',
            'errors', jsonb_build_array('not_authenticated')
        );
    END IF;

    -- Idempotent: only set if NULL
    UPDATE profiles
    SET consent_given_at = COALESCE(consent_given_at, now())
    WHERE id = v_user_id
    RETURNING consent_given_at INTO v_consent_given_at;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'consent_given_at', v_consent_given_at
        ),
        'message', 'تم توثيق موافقتك، يمكنك الآن النشر',
        'errors', jsonb_build_array()
    );
END;
$$;


CREATE OR REPLACE FUNCTION get_active_students_count()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_window_days INT;
    v_count INT;
BEGIN
    v_window_days := get_setting_int('active_users_window_days', 30);

    SELECT COUNT(*) INTO v_count
    FROM profiles
    WHERE role = 'student'
      AND last_active_at >= now() - (v_window_days || ' days')::interval;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object('count', v_count),
        'message', 'نجاح',
        'errors', jsonb_build_array()
    );
END;
$$;
