CREATE OR REPLACE FUNCTION test_func(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'null id');
    END IF;
    RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;
