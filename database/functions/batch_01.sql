-- === 01_get_default_recording.sql ===
CREATE OR REPLACE FUNCTION get_default_recording(p_hadith_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_recording RECORD;
    v_storage_url TEXT;
    v_min_likes INT;
    v_favorites JSONB;
    v_favorites_count INT;
    v_has_favorites BOOLEAN;
BEGIN
    IF p_hadith_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'data', NULL,
            'message', 'معرف الحديث مطلوب',
            'errors', jsonb_build_array('missing_hadith_id')
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
    v_storage_url := COALESCE(NULLIF(current_setting('app.settings.public_url', true), ''), 'https://placeholder.supabase.co');
    v_min_likes := get_setting_int('community_best_min_likes', 3);

    -- Layer 1: Personal favorites (authenticated only)
    IF v_user_id IS NOT NULL THEN
        SELECT COUNT(*) > 0, COUNT(*)
        INTO v_has_favorites, v_favorites_count
        FROM favorite_recordings fr
        JOIN recordings r ON r.id = fr.recording_id
        WHERE r.hadith_id = p_hadith_id AND fr.user_id = v_user_id AND r.is_hidden = false;

        IF v_has_favorites THEN
            SELECT r.* INTO v_recording
            FROM recordings r
            JOIN favorite_recordings fr ON fr.recording_id = r.id
            WHERE r.hadith_id = p_hadith_id AND fr.user_id = v_user_id AND r.is_hidden = false
            ORDER BY r.likes_count DESC
            LIMIT 1;

            IF v_favorites_count > 1 THEN
                SELECT jsonb_agg(jsonb_build_object(
                    'recording_id', fr.recording_id
                )) INTO v_favorites
                FROM favorite_recordings fr
                JOIN recordings r ON r.id = fr.recording_id
                WHERE r.hadith_id = p_hadith_id AND fr.user_id = v_user_id AND r.is_hidden = false;
            END IF;

            RETURN jsonb_build_object(
                'success', true,
                'data', jsonb_build_object(
                    'recording_id', v_recording.id,
                    'user_id', v_recording.user_id,
                    'display_name', (SELECT display_name FROM profiles WHERE id = v_recording.user_id),
                    'file_url', v_storage_url || '/storage/v1/object/public/recordings/' || v_recording.file_path,
                    'duration_seconds', v_recording.duration_seconds,
                    'likes_count', v_recording.likes_count,
                    'listens_count', v_recording.listens_count,
                    'is_verified', v_recording.is_verified,
                    'selection_layer', 'favorite',
                    'favorites_count', v_favorites_count,
                    'favorite_recordings', COALESCE(v_favorites, '[]'::jsonb)
                ),
                'message', 'تم تحديد التسجيل الافتراضي',
                'errors', jsonb_build_array()
            );
        END IF;
    END IF;

    -- Layer 2: Verified (newest verified first, then most likes)
    SELECT r.* INTO v_recording
    FROM recordings r
    WHERE r.hadith_id = p_hadith_id AND r.is_hidden = false AND r.is_verified = true
    ORDER BY r.verified_at DESC NULLS LAST, r.likes_count DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'recording_id', v_recording.id,
                'user_id', v_recording.user_id,
                'display_name', (SELECT display_name FROM profiles WHERE id = v_recording.user_id),
                'file_url', v_storage_url || '/storage/v1/object/public/recordings/' || v_recording.file_path,
                'duration_seconds', v_recording.duration_seconds,
                'likes_count', v_recording.likes_count,
                'listens_count', v_recording.listens_count,
                'is_verified', v_recording.is_verified,
                'selection_layer', 'verified',
                'favorites_count', 0
            ),
            'message', 'تم تحديد التسجيل الافتراضي',
            'errors', jsonb_build_array()
        );
    END IF;

    -- Layer 3: Community best (highest likes >= community_best_min_likes)
    SELECT r.* INTO v_recording
    FROM recordings r
    WHERE r.hadith_id = p_hadith_id AND r.is_hidden = false
    ORDER BY r.likes_count DESC
    LIMIT 1;

    IF FOUND AND v_recording.likes_count >= v_min_likes THEN
        RETURN jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'recording_id', v_recording.id,
                'user_id', v_recording.user_id,
                'display_name', (SELECT display_name FROM profiles WHERE id = v_recording.user_id),
                'file_url', v_storage_url || '/storage/v1/object/public/recordings/' || v_recording.file_path,
                'duration_seconds', v_recording.duration_seconds,
                'likes_count', v_recording.likes_count,
                'listens_count', v_recording.listens_count,
                'is_verified', v_recording.is_verified,
                'selection_layer', 'community',
                'favorites_count', 0
            ),
            'message', 'تم تحديد التسجيل الافتراضي',
            'errors', jsonb_build_array()
        );
    END IF;

    -- Fallback: newest recording
    SELECT r.* INTO v_recording
    FROM recordings r
    WHERE r.hadith_id = p_hadith_id AND r.is_hidden = false
    ORDER BY r.created_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'recording_id', v_recording.id,
                'user_id', v_recording.user_id,
                'display_name', (SELECT display_name FROM profiles WHERE id = v_recording.user_id),
                'file_url', v_storage_url || '/storage/v1/object/public/recordings/' || v_recording.file_path,
                'duration_seconds', v_recording.duration_seconds,
                'likes_count', v_recording.likes_count,
                'listens_count', v_recording.listens_count,
                'is_verified', v_recording.is_verified,
                'selection_layer', 'latest',
                'favorites_count', 0
            ),
            'message', 'تم تحديد التسجيل الافتراضي',
            'errors', jsonb_build_array()
        );
    END IF;

    -- No recordings found
    RETURN jsonb_build_object(
        'success', true,
        'data', NULL,
        'message', 'لا توجد تسجيلات لهذا الحديث بعد',
        'errors', jsonb_build_array()
    );
END;
$$;

-- === 02_list_recordings.sql ===
CREATE OR REPLACE FUNCTION list_recordings(
    p_hadith_id UUID,
    p_sort TEXT DEFAULT 'top',
    p_favorites_only BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
            'message', 'ترتيب غير صالح — اختر top أو most_listened أو latest',
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
            'message', 'يجب تسجيل الدخول لعرض المفضلة',
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

-- === 03_register_listen.sql ===
CREATE OR REPLACE FUNCTION register_listen(p_recording_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    UPDATE recordings
    SET listens_count = listens_count + 1
    WHERE id = p_recording_id;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'recording_id', p_recording_id
        ),
        'message', 'تم تسجيل الاستماع',
        'errors', jsonb_build_array()
    );
END;
$$;
