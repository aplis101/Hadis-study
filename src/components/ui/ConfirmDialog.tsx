"use client";

import Modal from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  message?: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  variant?: string;
  loading?: boolean;
}

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  variant,
  loading = false,
}: ConfirmDialogProps) {
  const desc = description ?? message ?? "";
  const confirm = confirmLabel ?? confirmText ?? "حذف نهائي";
  const cancel = cancelLabel ?? cancelText ?? "إلغاء";
  const isDanger = variant === "danger" || !variant;

  return (
    <Modal open={open} onClose={onClose} title={title} ariaLabel="تأكيد الإجراء">
      <p className="text-sm text-stone-600 leading-relaxed">{desc}</p>
      <div className="flex items-center gap-3 mt-6">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancel}
        </Button>
        <Button variant={isDanger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
          {confirm}
        </Button>
      </div>
    </Modal>
  );
}

export { ConfirmDialog };
