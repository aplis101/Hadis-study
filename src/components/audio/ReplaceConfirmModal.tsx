'use client'

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface ReplaceConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
}

export function ReplaceConfirmModal({ open, onClose, onConfirm, loading = false }: ReplaceConfirmModalProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="استبدال التسجيل"
      message="لديك تسجيل سابق لهذا الحديث. تأكيد استبدال القديم بالجديد؟ سيُحذف القديم نهائياً بعدّاداته."
      confirmText="استبدال"
      cancelText="إلغاء"
      variant="danger"
      loading={loading}
    />
  )
}
