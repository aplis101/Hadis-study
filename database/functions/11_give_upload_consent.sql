CREATE OR REPLACE FUNCTION give_upload_consent()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_consent_given_at TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'يجب تسجيل الدخول أولاً',
            'errors', jsonb_build_array('not_authenticated')
        );
    END IF;

    -- Idempotent: only set if NULL
    UPDATE profiles
    SET consent_given_at = COALESCE(consent_given_at, now())
    WHERE id = v_user_id
    RETURNING consent_given_at INTO v_consent_given_at;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'consent_given_at', v_consent_given_at
        ),
        'message', 'تم توثيق موافقتك، يمكنك الآن النشر',
        'errors', jsonb_build_array()
    );
END;
$$;
