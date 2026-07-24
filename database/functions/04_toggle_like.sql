CREATE OR REPLACE FUNCTION toggle_like(p_recording_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_liked BOOLEAN;
    v_likes_count INT;
BEGIN
    IF p_recording_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'data', NULL,
            'message', 'معرف التسجيل مطلوب',
            'errors', jsonb_build_array('missing_recording_id')
        );
    END IF;

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'data', NULL,
            'message', 'سجّل الدخول للإعجاب',
            'errors', jsonb_build_array('not_authenticated')
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

    -- Atomic toggle within a transaction
    IF EXISTS (SELECT 1 FROM likes WHERE recording_id = p_recording_id AND user_id = v_user_id) THEN
        DELETE FROM likes WHERE recording_id = p_recording_id AND user_id = v_user_id;
        UPDATE recordings SET likes_count = likes_count - 1 WHERE id = p_recording_id
        RETURNING likes_count INTO v_likes_count;
        v_liked := false;
    ELSE
        INSERT INTO likes (recording_id, user_id) VALUES (p_recording_id, v_user_id);
        UPDATE recordings SET likes_count = likes_count + 1 WHERE id = p_recording_id
        RETURNING likes_count INTO v_likes_count;
        v_liked := true;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'liked', v_liked,
            'likes_count', v_likes_count
        ),
        'message', CASE WHEN v_liked THEN 'تم تسجيل الإعجاب' ELSE 'تم إلغاء الإعجاب' END,
        'errors', jsonb_build_array()
    );
END;
$$;
