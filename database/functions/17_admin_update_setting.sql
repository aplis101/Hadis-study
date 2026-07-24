CREATE OR REPLACE FUNCTION admin_update_setting(
    p_key TEXT,
    p_value JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
