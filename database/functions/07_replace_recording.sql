CREATE OR REPLACE FUNCTION replace_recording(
    p_hadith_id UUID,
    p_file_path TEXT,
    p_duration_seconds INT,
    p_file_size_bytes INT,
    p_codec TEXT DEFAULT 'opus',
    p_bitrate_kbps INT DEFAULT 32
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_length_class hadith_length;
    v_recent_count INT;
    v_rate_limit INT;
    v_max_duration INT;
    v_recording recordings;
BEGIN
    -- 1. Authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'يجب تسجيل الدخول أولاً',
            'errors', jsonb_build_array('not_authenticated')
        );
    END IF;

    -- 2. Upload enabled check
    IF get_setting_bool('upload_enabled', true) = false THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'الرفع متوقف مؤقتاً من الإدارة',
            'errors', jsonb_build_array('upload_disabled')
        );
    END IF;

    -- 3. Consent check
    IF NOT has_upload_consent() THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'الموافقة على سياسة النشر مطلوبة أولاً',
            'errors', jsonb_build_array('consent_required')
        );
    END IF;

    -- 4. Rate limit (ALG-005)
    v_rate_limit := get_setting_int('rate_limit_uploads_per_hour', 5);
    SELECT COUNT(*) INTO v_recent_count
    FROM recordings
    WHERE user_id = v_user_id AND created_at >= now() - interval '1 hour';
    IF v_recent_count >= v_rate_limit THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'تجاوزت الحد الأقصى للرفع (' || v_rate_limit || ' تسجيلات/ساعة). حاول لاحقاً.',
            'errors', jsonb_build_array('rate_limited')
        );
    END IF;

    -- 5. Validate hadith exists and get length_class
    SELECT length_class INTO v_length_class FROM hadiths WHERE id = p_hadith_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'الحديث غير موجود',
            'errors', jsonb_build_array('hadith_not_found')
        );
    END IF;

    -- 6. Validate duration by length_class
    v_max_duration := CASE WHEN v_length_class = 'short' THEN 30 ELSE 180 END;
    IF p_duration_seconds <= 0 OR p_duration_seconds > v_max_duration THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'مدة التسجيل تتجاوز الحد المسموح لهذا الحديث',
            'errors', jsonb_build_array('duration_exceeded')
        );
    END IF;

    -- 7. Validate file size
    IF p_file_size_bytes <= 0 OR p_file_size_bytes > 5242880 THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'حجم الملف يتجاوز الحد المسموح (5 ميجابايت)',
            'errors', jsonb_build_array('file_size_exceeded')
        );
    END IF;

    -- 8. Validate codec
    IF p_codec NOT IN ('opus', 'aac') THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'نوع الملف غير مدعوم — الترميز المعتمد Opus/AAC',
            'errors', jsonb_build_array('unsupported_codec')
        );
    END IF;

    -- 9. Validate bitrate
    IF p_bitrate_kbps < 16 OR p_bitrate_kbps > 64 THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'معدل البت غير صالح — يجب أن يكون بين 16 و 64',
            'errors', jsonb_build_array('invalid_bitrate')
        );
    END IF;

    -- 10. Atomic replace: delete old + insert new (ALG-004)
    BEGIN
        -- Delete old recording (CASCADE removes likes, favorites, listens, reports)
        DELETE FROM recordings WHERE hadith_id = p_hadith_id AND user_id = v_user_id;

        -- Insert new recording
        INSERT INTO recordings (hadith_id, user_id, file_path, duration_seconds, file_size_bytes, codec, bitrate_kbps)
        VALUES (p_hadith_id, v_user_id, p_file_path, p_duration_seconds, p_file_size_bytes, p_codec, p_bitrate_kbps)
        RETURNING * INTO v_recording;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', false, 'data', NULL,
                'message', 'حدث خطأ أثناء استبدال التسجيل',
                'errors', jsonb_build_array('replace_failed')
            );
    END;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', v_recording.id,
            'hadith_id', v_recording.hadith_id,
            'user_id', v_recording.user_id,
            'file_path', v_recording.file_path,
            'duration_seconds', v_recording.duration_seconds,
            'file_size_bytes', v_recording.file_size_bytes,
            'codec', v_recording.codec,
            'bitrate_kbps', v_recording.bitrate_kbps,
            'likes_count', v_recording.likes_count,
            'listens_count', v_recording.listens_count,
            'is_verified', v_recording.is_verified,
            'is_hidden', v_recording.is_hidden,
            'created_at', v_recording.created_at
        ),
        'message', 'تم استبدال تسجيلك بنجاح',
        'errors', jsonb_build_array()
    );
END;
$$;
