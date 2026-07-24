CREATE OR REPLACE FUNCTION admin_resolve_report(
    p_report_id UUID,
    p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_report reports;
    v_message TEXT;
    v_recording_id UUID;
    v_file_path TEXT;
BEGIN
    IF NOT is_admin() THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'الوصول مقيد بالمشرفين',
            'errors', jsonb_build_array('forbidden')
        );
    END IF;

    IF p_action NOT IN ('dismiss', 'hide', 'delete_recording', 'restore') THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'إجراء غير معروف — استخدم dismiss, hide, delete_recording, أو restore',
            'errors', jsonb_build_array('invalid_action')
        );
    END IF;

    SELECT * INTO v_report FROM reports WHERE id = p_report_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 'data', NULL,
            'message', 'البلاغ غير موجود',
            'errors', jsonb_build_array('report_not_found')
        );
    END IF;

    v_recording_id := v_report.recording_id;

    CASE p_action
        WHEN 'dismiss' THEN
            UPDATE reports SET status = 'dismissed', resolved_by = auth.uid(), resolved_at = now()
            WHERE id = p_report_id;
            v_message := 'تم رفض البلاغ';

        WHEN 'hide' THEN
            UPDATE recordings SET is_hidden = true, hidden_reason = 'admin_manual' WHERE id = v_recording_id;
            UPDATE reports SET status = 'resolved', resolved_by = auth.uid(), resolved_at = now()
            WHERE id = p_report_id;
            v_message := 'تم إخفاء التسجيل';

        WHEN 'delete_recording' THEN
            SELECT file_path INTO v_file_path FROM recordings WHERE id = v_recording_id;
            DELETE FROM recordings WHERE id = v_recording_id;
            UPDATE reports SET status = 'resolved', resolved_by = auth.uid(), resolved_at = now()
            WHERE id = p_report_id;
            v_message := 'تم حذف التسجيل';

        WHEN 'restore' THEN
            UPDATE recordings SET is_hidden = false, hidden_reason = NULL WHERE id = v_recording_id;
            UPDATE reports SET status = 'dismissed', resolved_by = auth.uid(), resolved_at = now()
            WHERE recording_id = v_recording_id AND status IN ('open', 'reviewing');
            v_message := 'تم استرجاع التسجيل';
    END CASE;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'action', p_action,
            'recording_id', v_recording_id,
            'file_path', v_file_path
        ),
        'message', v_message,
        'errors', jsonb_build_array()
    );
END;
$$;
