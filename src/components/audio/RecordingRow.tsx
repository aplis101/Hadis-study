'use client'

import { useState, useCallback } from 'react'
import type { Recording } from '@/types'
import { IconButton } from '@/components/ui/IconButton'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Play, Pause, Heart, Star, Flag, Trash2, BadgeCheck, User } from 'lucide-react'

interface RecordingRowProps {
  recording: Recording
  isActive: boolean
  onPlay: (recording: Recording) => void
  onDeleted?: () => void
  showIdentity?: boolean
}

export function RecordingRow({ recording, isActive, onPlay, onDeleted, showIdentity = false }: RecordingRowProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [liked, setLiked] = useState(recording.is_liked_by_me ?? false)
  const [likesCount, setLikesCount] = useState(recording.likes_count)
  const [favorited, setFavorited] = useState(recording.is_favorited_by_me ?? false)
  const [togglingLike, setTogglingLike] = useState(false)
  const [togglingFav, setTogglingFav] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleLike = useCallback(async () => {
    setTogglingLike(true)
    const { data, error } = await supabase.rpc('toggle_like', { p_recording_id: recording.id })
    if (!error && data) {
      setLiked(data.liked)
      setLikesCount(data.likes_count)
    } else {
      showToast('تعذّر تحديث الإعجاب', 'error')
    }
    setTogglingLike(false)
  }, [recording.id, supabase, showToast])

  const handleFavorite = useCallback(async () => {
    setTogglingFav(true)
    const { data, error } = await supabase.rpc('toggle_favorite', { p_recording_id: recording.id })
    if (!error && data) {
      setFavorited(data.favorited)
    } else {
      showToast('تعذّر تحديث التفضيل', 'error')
    }
    setTogglingFav(false)
  }, [recording.id, supabase, showToast])

  const handleDelete = useCallback(async () => {
    if (!confirm('هل أنت متأكد من حذف هذا التسجيل؟')) return
    setDeleting(true)
    const { error } = await supabase.rpc('delete_recording', { p_recording_id: recording.id })
    if (!error) {
      showToast('تم حذف التسجيل', 'success')
      onDeleted?.()
    } else {
      showToast('تعذّر حذف التسجيل', 'error')
    }
    setDeleting(false)
  }, [recording.id, supabase, showToast, onDeleted])

  const handleReport = useCallback(async () => {
    const reason = prompt('سبب البلاغ: تلاوة خاطئة, جودة رديئة, غير مناسب, أخرى')
    if (!reason) return
    const reasonMap: Record<string, string> = {
      'تلاوة خاطئة': 'incorrect_recitation',
      'جودة رديئة': 'poor_quality',
      'غير مناسب': 'inappropriate',
      'أخرى': 'other',
    }
    const mappedReason = reasonMap[reason] || 'other'
    const { error } = await supabase.rpc('submit_report', {
      p_recording_id: recording.id,
      p_reason: mappedReason,
      p_details: '',
    })
    if (!error) {
      showToast('وصل بلاغك للإدارة', 'success')
    } else {
      showToast(error.message || 'تعذّر إرسال البلاغ', 'error')
    }
  }, [recording.id, supabase, showToast])

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-stone-50'}`}>
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
        <User className="w-5 h-5 text-emerald-700" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-stone-900">{recording.display_name || 'مستخدم'}</span>
          {recording.is_verified && (
            <BadgeCheck className="w-4 h-4 text-emerald-700" aria-label="معتمد" />
          )}
          {recording.is_favorited_by_me && (
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" aria-label="مفضّل لدي" />
          )}
          {recording.is_community_best && (
            <Badge variant="community">⭐ الأعلى تقييماً</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5">
          <span className="flex items-center gap-1" dir="ltr">
            <Heart className="w-3 h-3" /> {likesCount}
          </span>
          <span className="flex items-center gap-1" dir="ltr">
            🎧 {recording.listens_count}
          </span>
          <span dir="ltr">{formatDuration(recording.duration_seconds)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        <IconButton
          label={isActive ? 'إيقاف' : 'تشغيل'}
          onClick={() => onPlay(recording)}
          activeColor="text-emerald-700"
        >
          {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </IconButton>
        <IconButton
          label="إعجاب"
          active={liked}
          activeColor="text-rose-600"
          onClick={handleLike}
          disabled={togglingLike}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-rose-600' : ''}`} />
        </IconButton>
        <IconButton
          label="تفضيل"
          active={favorited}
          activeColor="text-amber-500"
          onClick={handleFavorite}
          disabled={togglingFav}
        >
          <Star className={`w-4 h-4 ${favorited ? 'fill-amber-500' : ''}`} />
        </IconButton>
        <IconButton label="إبلاغ" onClick={handleReport}>
          <Flag className="w-4 h-4" />
        </IconButton>
        {(recording.is_mine || showIdentity) && (
          <IconButton label="حذف" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </IconButton>
        )}
      </div>
    </div>
  )
}
