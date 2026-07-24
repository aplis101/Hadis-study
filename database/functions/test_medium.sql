CREATE OR REPLACE FUNCTION test_medium(p_hadith_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_storage_url TEXT;
BEGIN
    IF p_hadith_id IS NULL THEN
        RETURN jsonb_build_object('success', false);
    END IF;
    v_user_id := auth.uid();
    v_storage_url := current_setting('app.settings.public_url', true);
    RETURN jsonb_build_object('success', true, 'id', p_hadith_id);
END;
$$;
