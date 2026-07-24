'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Save } from 'lucide-react'

interface SettingCardProps {
  title: string
  description: string
  settingKey: string
  value: any
  type: 'number' | 'boolean' | 'text'
  validation?: { min?: number; max?: number }
  updatedBy?: string
  updatedAt?: string
}

export function SettingCard({
  title,
  description,
  settingKey,
  value: initialValue,
  type,
  validation,
  updatedBy,
  updatedAt,
}: SettingCardProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const validate = (val: any): boolean => {
    if (type === 'number') {
      const num = Number(val)
      if (isNaN(num)) { setError('يجب أن يكون رقماً'); return false }
      if (validation?.min !== undefined && num < validation.min) {
        setError(`الحد الأدنى ${validation.min}`); return false
      }
      if (validation?.max !== undefined && num > validation.max) {
        setError(`الحد الأقصى ${validation.max}`); return false
      }
    }
    setError('')
    return true
  }

  const handleSave = async () => {
    if (!validate(value)) return

    setSaving(true)
    const { error: rpcError } = await supabase.rpc('admin_update_setting', {
      p_key: settingKey,
      p_value: type === 'number' ? Number(value) : value,
    })
    setSaving(false)

    if (rpcError) {
      showToast(rpcError.message || 'تعذّر حفظ الإعداد', 'error')
    } else {
      showToast('تم حفظ الإعداد', 'success')
    }
  }

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('ar-SA', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
          <p className="text-xs text-stone-500 mt-0.5">{description}</p>
        </div>

        {type === 'boolean' ? (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => setValue(e.target.checked)}
              className="w-5 h-5 rounded accent-emerald-700"
            />
            <span className="text-sm text-stone-700">{value ? 'مفعّل' : 'معطّل'}</span>
          </label>
        ) : (
          <div>
            <input
              type={type === 'number' ? 'number' : 'text'}
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setError('')
              }}
              className={`w-full px-3 py-2 rounded-lg border text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 ${
                error ? 'border-red-300' : 'border-stone-200'
              }`}
              dir="ltr"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
        )}

        <div className="flex items-center justify-between">
          {updatedAt && (
            <span className="text-xs text-stone-400">
              آخر تعديل: {updatedBy || '---'} · {formatDate(updatedAt)}
            </span>
          )}
          <Button size="sm" onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" />
            حفظ
          </Button>
        </div>
      </div>
    </Card>
  )
}
