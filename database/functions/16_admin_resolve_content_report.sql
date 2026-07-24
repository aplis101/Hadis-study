CREATE OR REPLACE FUNCTION admin_resolve_content_report(
    p_report_id UUID,
    p_status content_report_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_report content_reports;
BEGIN
    IF NOT is_admin() THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'الوصول مقيد بالمشرفين',
            'errors', jsonb_build_array('forbidden')
        );
    END IF;

    IF p_status NOT IN ('in_progress', 'resolved', 'dismissed') THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'حالة غير معروفة — استخدم in_progress, resolved, أو dismissed',
            'errors', jsonb_build_array('invalid_status')
        );
    END IF;

    SELECT * INTO v_report FROM content_reports WHERE id = p_report_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'بلاغ المحتوى غير موجود',
            'errors', jsonb_build_array('content_report_not_found')
        );
    END IF;

    UPDATE content_reports
    SET status = p_status, resolved_by = auth.uid(), resolved_at = now()
    WHERE id = p_report_id
    RETURNING * INTO v_report;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', v_report.id,
            'status', v_report.status,
            'resolved_by', v_report.resolved_by,
            'resolved_at', v_report.resolved_at
        ),
        'message', 'تم تحديث حالة بلاغ المحتوى',
        'errors', jsonb_build_array()
    );
END;
$$;
