'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Recording, SortOption } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { RecordingRow } from './RecordingRow'
import { createClient } from '@/lib/supabase/client'
import { Mic, AlertCircle } from 'lucide-react'

const sortTabs = [
  { value: 'top', label: 'الأعلى تقييماً' },
  { value: 'most_listened', label: 'الأكثر استماعاً' },
  { value: 'latest', label: 'الأحدث' },
]

interface RecordingsSheetProps {
  open: boolean
  onClose: () => void
  hadithId: string
  activeRecordingId: string | null
  onPlayRecording: (recording: Recording) => void
  onAddRecording: () => void
  uploadEnabled: boolean
  canRecord: boolean
}

export function RecordingsSheet({
  open,
  onClose,
  hadithId,
  activeRecordingId,
  onPlayRecording,
  onAddRecording,
  uploadEnabled,
  canRecord,
}: RecordingsSheetProps) {
  const supabase = createClient()
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<SortOption>('top')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
  }, [supabase])

  const fetchRecordings = useCallback(async () => {
    setLoading(true)
    setError(null)

    const params: any = { p_hadith_id: hadithId }
    if (!favoritesOnly) {
      params.p_sort = sort
    }

    const { data, error: rpcError } = await supabase.rpc(
      favoritesOnly ? 'list_recordings' : 'list_recordings',
      favoritesOnly ? { p_hadith_id: hadithId, p_favorites_only: true } : params
    )

    if (rpcError) {
      setError(rpcError.message)
    } else if (data?.recordings) {
      setRecordings(data.recordings.map((r: any) => ({
        ...r,
        is_mine: user ? r.user_id === user.id : false,
      })))
    } else {
      setRecordings([])
    }
    setLoading(false)
  }, [hadithId, sort, favoritesOnly, supabase, user])

  useEffect(() => {
    if (open) fetchRecordings()
  }, [open, fetchRecordings])

  // Extended tabs with favorites for authenticated users
  const tabs = user
    ? [...sortTabs, { value: 'favorites', label: '⭐ المفضّلة لدي' }]
    : sortTabs

  const handleSortChange = (val: string) => {
    if (val === 'favorites') {
      setFavoritesOnly(true)
    } else {
      setFavoritesOnly(false)
      setSort(val as SortOption)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="التسجيلات الصوتية">
      {/* Filter tabs */}
      <FilterTabs
        tabs={tabs}
        value={favoritesOnly ? 'favorites' : sort}
        onChange={handleSortChange}
        className="mb-3"
      />

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" count={4} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
          <p className="text-sm text-stone-600 mb-3">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchRecordings}>إعادة المحاولة</Button>
        </div>
      ) : recordings.length === 0 ? (
        <EmptyState
          icon={<Mic className="w-12 h-12" />}
          title={favoritesOnly ? 'لم تفضّل أي تسجيل بعد' : 'لا تسجيلات بعد'}
          description={favoritesOnly ? 'ضع ⭐ على قارئك المفضّل' : 'كن أول من يسجّل هذا الحديث'}
          action={
            canRecord && uploadEnabled && (
              <Button onClick={onAddRecording}>
                <Mic className="w-4 h-4" />
                أضف تسجيلك الصوتي
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-1">
          {recordings.map((rec) => (
            <RecordingRow
              key={rec.id}
              recording={rec}
              isActive={activeRecordingId === rec.id}
              onPlay={onPlayRecording}
              onDeleted={fetchRecordings}
            />
          ))}
        </div>
      )}

      {/* Add recording button */}
      {canRecord && uploadEnabled && recordings.length > 0 && (
        <div className="sticky bottom-0 pt-3 pb-1 bg-white">
          <Button className="w-full" onClick={onAddRecording}>
            <Mic className="w-4 h-4" />
            أضف تسجيلك الصوتي
          </Button>
        </div>
      )}

      {!uploadEnabled && (
        <p className="text-xs text-amber-600 text-center py-2">الرفع متوقف مؤقتاً من الإدارة</p>
      )}
    </BottomSheet>
  )
}
