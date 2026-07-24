CREATE OR REPLACE FUNCTION delete_recording(p_recording_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_recording recordings;
BEGIN
    IF p_recording_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'معرف التسجيل مطلوب',
            'errors', jsonb_build_array('missing_recording_id')
        );
    END IF;

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'يجب تسجيل الدخول أولاً',
            'errors', jsonb_build_array('not_authenticated')
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

    -- Owner or admin only
    IF v_recording.user_id <> v_user_id AND NOT is_admin() THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'لا تملك حذف هذا التسجيل',
            'errors', jsonb_build_array('forbidden')
        );
    END IF;

    -- Delete recording (CASCADE removes likes, favorites, listens, reports)
    DELETE FROM recordings WHERE id = p_recording_id;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'deleted', true,
            'file_path', v_recording.file_path
        ),
        'message', 'تم حذف التسجيل',
        'errors', jsonb_build_array()
    );
END;
$$;
