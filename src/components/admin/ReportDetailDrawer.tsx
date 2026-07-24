'use client'

import { useState, useEffect } from 'react'
import type { ReportQueueItem, Report } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { VerifyButton } from './VerifyButton'
import { X, Play, Pause, User, Mail, Flag, Calendar } from 'lucide-react'

interface ReportDetailDrawerProps {
  open: boolean
  onClose: () => void
  item: ReportQueueItem | null
  onAction: () => void
}

export function ReportDetailDrawer({ open, onClose, item, onAction }: ReportDetailDrawerProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!open || !item) return
    const fetchReports = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('reports')
        .select('*')
        .eq('recording_id', item.recording_id)
        .order('created_at', { ascending: false })
      if (data) setReports(data)
      setLoading(false)
    }
    fetchReports()
  }, [open, item, supabase])

  const handleAction = async (action: string) => {
    if (!item) return
    setActionLoading(action)
    const { error } = await supabase.rpc('admin_resolve_report', {
      p_report_id: item.recording_id,
      p_action: action,
    })
    setActionLoading(null)

    if (error) {
      showToast(error.message || 'تعذّر تنفيذ الإجراء', 'error')
      return
    }
    showToast('تم تنفيذ القرار', 'success')
    onAction()
  }

  const playAudio = () => {
    if (!item) return
    if (audioRef[0]) {
      audioRef[0].pause()
      audioRef[0] = null
      setIsPlaying(false)
    } else {
      // We'd need the recording URL - fetch it
      supabase.from('recordings').select('file_url').eq('id', item.recording_id).single().then(({ data }) => {
        if (data?.file_url) {
          const audio = new Audio(data.file_url)
          audio.play()
          audioRef[0] = audio
          setIsPlaying(true)
          audio.onended = () => { setIsPlaying(false); audioRef[0] = null }
        }
      })
    }
  }

  if (!open || !item) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-3 flex items-center justify-between z-10">
          <h2 className="text-base font-semibold text-stone-900">تفاصيل البلاغ</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-stone-100" aria-label="إغلاق">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Audio player */}
          <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
            <button
              onClick={playAudio}
              className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center"
              aria-label={isPlaying ? 'إيقاف' : 'تشغيل'}
            >
              {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ms-0.5" />}
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium text-stone-900">استماع للتسجيل</p>
              <p className="text-xs text-stone-500">مقتطف: {item.hadith_excerpt}</p>
            </div>
          </div>

          {/* Recording info */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-stone-900">معلومات التسجيل</h3>
            <div className="bg-stone-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-stone-400" />
                <span className="text-stone-700">{item.owner_real_name}</span>
                <span className="text-stone-400">({item.owner_display_name})</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-stone-400" />
                <span className="text-stone-600" dir="ltr">{item.owner_email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Flag className="w-4 h-4 text-stone-400" />
                <span className="text-stone-600">{item.report_count} بلاغات</span>
                <span className="text-xs text-stone-400">· {item.reasons?.join('، ')}</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {item.is_hidden && <Badge variant="daif">مخفي</Badge>}
                {item.is_verified && <Badge variant="verified">معتمد ✅</Badge>}
              </div>
            </div>
          </div>

          {/* Reports list */}
          <div>
            <h3 className="text-sm font-semibold text-stone-900 mb-2">البلاغات</h3>
            {loading ? (
              <Skeleton className="h-12 w-full" count={2} />
            ) : reports.length === 0 ? (
              <p className="text-sm text-stone-500">لا توجد بلاغات مفصلة</p>
            ) : (
              <div className="space-y-2">
                {reports.map((report) => (
                  <div key={report.id} className="p-3 bg-stone-50 rounded-lg text-sm">
                    <p className="text-stone-700">{report.reason}</p>
                    {report.details && <p className="text-xs text-stone-500 mt-0.5">{report.details}</p>}
                    <div className="flex items-center gap-1 mt-1 text-xs text-stone-400">
                      <Calendar className="w-3 h-3" />
                      {new Date(report.created_at).toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verify button */}
          <VerifyButton
            recordingId={item.recording_id}
            isVerified={item.is_verified}
            onToggle={onAction}
            size="md"
          />

          {/* Action buttons */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-stone-900">الإجراءات</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => handleAction('dismiss')}
                loading={actionLoading === 'dismiss'}
              >
                إبقاء (رفض البلاغ)
              </Button>
              <Button
                variant="danger"
                onClick={() => handleAction('hide')}
                loading={actionLoading === 'hide'}
              >
                إخفاء
              </Button>
              {item.is_hidden && (
                <Button
                  variant="secondary"
                  onClick={() => handleAction('restore')}
                  loading={actionLoading === 'restore'}
                >
                  استرجاع
                </Button>
              )}
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm('هل أنت متأكد من حذف هذا التسجيل نهائياً؟')) {
                    handleAction('delete_recording')
                  }
                }}
                loading={actionLoading === 'delete_recording'}
              >
                حذف نهائي
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
