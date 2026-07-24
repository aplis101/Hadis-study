'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'

interface ConsentModalProps {
  open: boolean
  onClose: () => void
  onConsent: () => void
}

export function ConsentModal({ open, onClose, onConsent }: ConsentModalProps) {
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const { showToast } = useToast()

  const handleSubmit = async () => {
    if (!checked) return
    setLoading(true)
    const { error } = await supabase.rpc('give_upload_consent')
    setLoading(false)

    if (error) {
      showToast('تعذّر توثيق الموافقة', 'error')
      return
    }

    showToast('تم توثيق موافقتك، يمكنك الآن النشر', 'success')
    onConsent()
  }

  return (
    <Modal open={open} onClose={onClose} title="الموافقة على النشر">
      <div className="space-y-4">
        <p className="text-sm text-stone-700 leading-relaxed">
          عند نشر تسجيلك الصوتي على المنصة، سيكون مسموعاً لجميع زملائك في المقرر الدراسي.
          أنت توافق على أن يكون تسجيلك متاحاً للاستماع والتقييم من قبل زملائك والمشرف.
        </p>
        <label className="flex items-start gap-3 p-3 rounded-lg border border-stone-200 cursor-pointer hover:border-stone-300 transition-colors">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 accent-emerald-700"
          />
          <span className="text-sm text-stone-700">
            أوافق على أن يكون تسجيلي مسموعاً لجميع زملاء المقرر
          </span>
        </label>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={!checked} loading={loading}>
            متابعة
          </Button>
        </div>
      </div>
    </Modal>
  )
}
