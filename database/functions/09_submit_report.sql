CREATE OR REPLACE FUNCTION submit_report(
    p_recording_id UUID,
    p_reason report_reason,
    p_details TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
