CREATE OR REPLACE FUNCTION toggle_favorite(p_recording_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_favorited BOOLEAN;
    v_favorites_count_for_hadith INT;
    v_hadith_id UUID;
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
            'message', 'سجّل الدخول لاستخدام المفضلة',
            'errors', jsonb_build_array('not_authenticated')
        );
    END IF;

    SELECT hadith_id INTO v_hadith_id FROM recordings WHERE id = p_recording_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'data', NULL,
            'message', 'التسجيل غير موجود',
            'errors', jsonb_build_array('recording_not_found')
        );
    END IF;

    -- Toggle: no effect on likes_count (ALG-006)
    IF EXISTS (SELECT 1 FROM favorite_recordings WHERE recording_id = p_recording_id AND user_id = v_user_id) THEN
        DELETE FROM favorite_recordings WHERE recording_id = p_recording_id AND user_id = v_user_id;
        v_favorited := false;
    ELSE
        INSERT INTO favorite_recordings (recording_id, user_id) VALUES (p_recording_id, v_user_id);
        v_favorited := true;
    END IF;

    -- Count user's favorites for this hadith
    SELECT COUNT(*) INTO v_favorites_count_for_hadith
    FROM favorite_recordings fr
    JOIN recordings r ON r.id = fr.recording_id
    WHERE r.hadith_id = v_hadith_id AND fr.user_id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'favorited', v_favorited,
            'favorites_count_for_hadith', v_favorites_count_for_hadith
        ),
        'message', CASE WHEN v_favorited THEN 'أُضيف إلى مفضلتك' ELSE 'أُزيل من مفضلتك' END,
        'errors', jsonb_build_array()
    );
END;
$$;
