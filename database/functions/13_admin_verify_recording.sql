CREATE OR REPLACE FUNCTION admin_verify_recording(
    p_recording_id UUID,
    p_verify BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_recording recordings;
BEGIN
    IF NOT is_admin() THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'الوصول مقيد بالمشرفين',
            'errors', jsonb_build_array('forbidden')
        );
    END IF;

    IF p_recording_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'معرف التسجيل مطلوب',
            'errors', jsonb_build_array('missing_recording_id')
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

    IF p_verify THEN
        UPDATE recordings
        SET is_verified = true, verified_by = auth.uid(), verified_at = now()
        WHERE id = p_recording_id
        RETURNING * INTO v_recording;
    ELSE
        UPDATE recordings
        SET is_verified = false, verified_by = NULL, verified_at = NULL
        WHERE id = p_recording_id
        RETURNING * INTO v_recording;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', v_recording.id,
            'is_verified', v_recording.is_verified,
            'verified_by', v_recording.verified_by,
            'verified_at', v_recording.verified_at
        ),
        'message', CASE WHEN p_verify THEN 'تم اعتماد التسجيل ✅' ELSE 'تم سحب الاعتماد' END,
        'errors', jsonb_build_array()
    );
END;
$$;
