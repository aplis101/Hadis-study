'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { BadgeCheck, BadgeX } from 'lucide-react'

interface VerifyButtonProps {
  recordingId: string
  isVerified: boolean
  onToggle?: () => void
  size?: 'sm' | 'md'
}

export function VerifyButton({ recordingId, isVerified, onToggle, size = 'sm' }: VerifyButtonProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    const { error } = await supabase.rpc('admin_verify_recording', {
      p_recording_id: recordingId,
      p_verify: !isVerified,
    })
    setLoading(false)

    if (error) {
      showToast(error.message || 'تعذّر تحديث الاعتماد', 'error')
      return
    }

    showToast(isVerified ? 'تم سحب الاعتماد' : 'تم اعتماد التسجيل ✅', 'success')
    onToggle?.()
  }

  if (isVerified) {
    return (
      <Button variant="ghost" size={size} onClick={handleToggle} loading={loading}>
        <BadgeX className="w-4 h-4" />
        سحب الاعتماد
      </Button>
    )
  }

  return (
    <Button variant="primary" size={size} onClick={handleToggle} loading={loading}>
      <BadgeCheck className="w-4 h-4" />
      اعتماد ✅
    </Button>
  )
}
