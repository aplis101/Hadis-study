CREATE OR REPLACE FUNCTION list_recordings(
    p_hadith_id UUID,
    p_sort TEXT DEFAULT 'top',
    p_favorites_only BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_recordings JSONB;
    v_total INT;
    v_min_likes INT;
    v_storage_url TEXT;
BEGIN
    IF p_hadith_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'data', NULL,
            'message', 'معرف الحديث مطلوب',
            'errors', jsonb_build_array('missing_hadith_id')
        );
    END IF;

    IF p_sort NOT IN ('top', 'most_listened', 'latest') THEN
        RETURN jsonb_build_object(
            'success', false,
            'data', NULL,
            'message', 'نوع الفرز غير معروف — استخدم top أو most_listened أو latest',
            'errors', jsonb_build_array('invalid_sort')
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM hadiths WHERE id = p_hadith_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'data', NULL,
            'message', 'الحديث غير موجود',
            'errors', jsonb_build_array('hadith_not_found')
        );
    END IF;

    v_user_id := auth.uid();
    v_min_likes := get_setting_int('community_best_min_likes', 3);
    v_storage_url := COALESCE(NULLIF(current_setting('app.settings.public_url', true), ''), 'https://placeholder.supabase.co');

    IF p_favorites_only AND v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'data', NULL,
            'message', 'سجّل الدخول لاستخدام المفضلة',
            'errors', jsonb_build_array('not_authenticated')
        );
    END IF;

    WITH visible_recordings AS (
        SELECT r.*
        FROM recordings r
        WHERE r.hadith_id = p_hadith_id
          AND (r.is_hidden = false OR r.user_id = v_user_id OR is_admin())
    ),
    filtered AS (
        SELECT r.*
        FROM visible_recordings r
        WHERE NOT p_favorites_only OR EXISTS (
            SELECT 1 FROM favorite_recordings fr
            WHERE fr.recording_id = r.id AND fr.user_id = v_user_id
        )
    ),
    sorted AS (
        SELECT *
        FROM filtered
        ORDER BY
            CASE WHEN p_sort = 'top' THEN likes_count END DESC,
            CASE WHEN p_sort = 'most_listened' THEN listens_count END DESC,
            CASE WHEN p_sort = 'latest' THEN created_at END DESC,
            created_at DESC
    )
    SELECT
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', s.id,
            'user_id', s.user_id,
            'display_name', (SELECT display_name FROM profiles WHERE id = s.user_id),
            'file_url', v_storage_url || '/storage/v1/object/public/recordings/' || s.file_path,
            'duration_seconds', s.duration_seconds,
            'likes_count', s.likes_count,
            'listens_count', s.listens_count,
            'is_verified', s.is_verified,
            'is_community_best', s.likes_count >= v_min_likes,
            'created_at', s.created_at,
            'is_liked_by_me', CASE WHEN v_user_id IS NOT NULL THEN EXISTS (SELECT 1 FROM likes l WHERE l.recording_id = s.id AND l.user_id = v_user_id) ELSE false END,
            'is_favorited_by_me', CASE WHEN v_user_id IS NOT NULL THEN EXISTS (SELECT 1 FROM favorite_recordings fr WHERE fr.recording_id = s.id AND fr.user_id = v_user_id) ELSE false END,
            'is_mine', CASE WHEN v_user_id IS NOT NULL THEN s.user_id = v_user_id ELSE false END
        ) ORDER BY
            CASE WHEN p_sort = 'top' THEN s.likes_count END DESC,
            CASE WHEN p_sort = 'most_listened' THEN s.listens_count END DESC,
            CASE WHEN p_sort = 'latest' THEN s.created_at END DESC,
            s.created_at DESC), '[]'::jsonb),
        (SELECT COUNT(*) FROM filtered)
    INTO v_recordings, v_total
    FROM sorted s;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'recordings', COALESCE(v_recordings, '[]'::jsonb),
            'total', COALESCE(v_total, 0)
        ),
        'message', 'نجاح',
        'errors', jsonb_build_array()
    );
END;
$$;


CREATE OR REPLACE FUNCTION register_listen(p_recording_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION toggle_like(p_recording_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION toggle_favorite(p_recording_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
