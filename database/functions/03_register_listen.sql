CREATE OR REPLACE FUNCTION register_listen(p_recording_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_counted BOOLEAN;
    v_listens_count INT;
BEGIN
    IF p_recording_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'data', NULL,
            'message', 'معرف التسجيل مطلوب',
            'errors', jsonb_build_array('missing_recording_id')
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM recordings WHERE id = p_recording_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'data', NULL,
            'message', 'التسجيل غير موجود',
            'errors', jsonb_build_array('recording_not_found')
        );
    END IF;

    v_user_id := auth.uid();

    -- Anonymous visitors are not counted (EC-014)
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'counted', false,
                'listens_count', (SELECT listens_count FROM recordings WHERE id = p_recording_id)
            ),
            'message', 'يجب تسجيل الدخول لاحتساب الاستماع',
            'errors', jsonb_build_array()
        );
    END IF;

    -- Check if listen already exists (UNIQUE constraint guard)
    IF EXISTS (SELECT 1 FROM recording_listens WHERE recording_id = p_recording_id AND user_id = v_user_id) THEN
        SELECT listens_count INTO v_listens_count FROM recordings WHERE id = p_recording_id;
        RETURN jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'counted', false,
                'listens_count', v_listens_count
            ),
            'message', 'تم احتساب هذا الاستماع مسبقاً',
            'errors', jsonb_build_array()
        );
    END IF;

    -- Count this listen
    INSERT INTO recording_listens (recording_id, user_id) VALUES (p_recording_id, v_user_id);
    UPDATE recordings SET listens_count = listens_count + 1 WHERE id = p_recording_id
    RETURNING listens_count INTO v_listens_count;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'counted', true,
            'listens_count', v_listens_count
        ),
        'message', 'تم احتساب الاستماع',
        'errors', jsonb_build_array()
    );
END;
$$;
