'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { AlertTriangle } from 'lucide-react'

interface ContentReportFormProps {
  open: boolean
  onClose: () => void
  hadithId: string
}

const errorTypes = [
  { value: 'tashkeel', label: 'خطأ في التشكيل' },
  { value: 'translation', label: 'خطأ في الترجمة' },
  { value: 'isnad', label: 'خطأ في الإسناد' },
  { value: 'takhrij', label: 'خطأ في التخريج' },
  { value: 'other', label: 'أخرى' },
]

export function ContentReportForm({ open, onClose, hadithId }: ContentReportFormProps) {
  const [errorType, setErrorType] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()
  const { showToast } = useToast()

  const handleSubmit = async () => {
    if (!errorType) {
      showToast('نوع الخطأ مطلوب', 'error')
      return
    }
    if (!description.trim()) {
      showToast('الوصف مطلوب', 'error')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.rpc('submit_content_report', {
      p_hadith_id: hadithId,
      p_error_type: errorType,
      p_description: description.trim(),
    })

    setSubmitting(false)

    if (error) {
      showToast(error.message || 'تعذّر إرسال البلاغ', 'error')
      return
    }

    showToast('وصل بلاغك عن المحتوى للإدارة', 'success')
    setErrorType('')
    setDescription('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="⚠️ الإبلاغ عن خطأ في النص">
      <div className="space-y-4 mt-2">
        {/* Error type */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            نوع الخطأ <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {errorTypes.map((type) => (
              <label
                key={type.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  errorType === type.value
                    ? 'border-emerald-700 bg-emerald-50'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="errorType"
                  value={type.value}
                  checked={errorType === type.value}
                  onChange={(e) => setErrorType(e.target.value)}
                  className="accent-emerald-700"
                />
                <span className="text-sm text-stone-700">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            الوصف <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={4}
            className="w-full px-3 py-2.5 rounded-lg border border-stone-200 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 resize-none"
            placeholder="صف الخطأ بالتفصيل..."
          />
          <div className="text-xs text-stone-400 mt-1 text-end" dir="ltr">
            {description.length} / 1000
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            <AlertTriangle className="w-4 h-4" />
            إرسال البلاغ
          </Button>
        </div>
      </div>
    </Modal>
  )
}
