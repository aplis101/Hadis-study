CREATE OR REPLACE FUNCTION get_active_students_count()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
