CREATE OR REPLACE FUNCTION test_record(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rec RECORD;
BEGIN
    IF p_id IS NULL THEN
        RETURN jsonb_build_object('success', false);
    END IF;
    SELECT * INTO v_rec FROM hadiths WHERE id = p_id LIMIT 1;
    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'found', true);
    END IF;
    RETURN jsonb_build_object('success', true, 'found', false);
END;
$$;
