'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Recording, DefaultRecording } from '@/types'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { createClient } from '@/lib/supabase/client'
import { Play, Pause, BadgeCheck, Star, ChevronUp, Volume2 } from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SegmentedToggle } from '@/components/ui/SegmentedToggle'
import { RecordingsSheet } from './RecordingsSheet'
import { RecorderModal } from './RecorderModal'
import { ConsentModal } from './ConsentModal'

interface AudioBottomBarProps {
  hadithId: string
}

export function AudioBottomBar({ hadithId }: AudioBottomBarProps) {
  const supabase = createClient()
  const player = useAudioPlayer()
  const [defaultRecording, setDefaultRecording] = useState<Recording | null>(null)
  const [allRecordings, setAllRecordings] = useState<Recording[]>([])
  const [currentRecording, setCurrentRecording] = useState<Recording | null>(null)
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [recorderOpen, setRecorderOpen] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [uploadEnabled, setUploadEnabled] = useState(true)
  const [consentGiven, setConsentGiven] = useState(false)
  const [favorites, setFavorites] = useState<Recording[]>([])
  const [selectedFavorite, setSelectedFavorite] = useState<string>('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
  }, [supabase])

  // Fetch default recording
  const fetchDefault = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_default_recording', {
      p_hadith_id: hadithId,
    })
    if (!error && data?.data) {
      const rec = data.data as DefaultRecording
      const recording: Recording = { ...rec, id: rec.recording_id }
      setDefaultRecording(recording)
      if (!currentRecording) {
        setCurrentRecording(recording)
        player.load(rec.file_url)
      }
      // Handle favorites for segmented toggle
      if (rec.selection_layer === 'favorite' && rec.favorite_recordings) {
        const mapped = rec.favorite_recordings.map((r: any) => ({ ...r, id: r.recording_id || r.id }))
        setFavorites(mapped as Recording[])
        setSelectedFavorite(rec.recording_id)
      }
    } else {
      setDefaultRecording(null)
    }
    setLoading(false)
  }, [hadithId, supabase, player, currentRecording])

  useEffect(() => {
    fetchDefault()
  }, [hadithId])

  // Check upload settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data: settings } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'upload_enabled')
        .single()
      if (settings) setUploadEnabled(settings.value)

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('consent_given_at')
          .eq('id', user.id)
          .single()
        if (profile?.consent_given_at) setConsentGiven(true)
      }
    }
    fetchSettings()
  }, [supabase, user])

  const handlePlayDefault = () => {
    if (currentRecording && currentRecording.file_url) {
      if (player.isPlaying && player.audioRef.current?.src.includes(currentRecording.file_url)) {
        player.pause()
      } else {
        if (!player.audioRef.current || !player.audioRef.current.src.includes(currentRecording.file_url)) {
          player.load(currentRecording.file_url)
        }
        setTimeout(() => player.play(), 100)
      }
    }
  }

  const handlePlayRecording = (recording: Recording) => {
    setCurrentRecording(recording)
    player.load(recording.file_url)
    setTimeout(() => player.play(), 100)
  }

  const handleAddRecording = () => {
    setSheetOpen(false)
    if (!consentGiven) {
      setConsentOpen(true)
    } else {
      setRecorderOpen(true)
    }
  }

  const handleConsentGiven = () => {
    setConsentGiven(true)
    setConsentOpen(false)
    setRecorderOpen(true)
  }

  const handleFavoriteChange = (value: string) => {
    setSelectedFavorite(value)
    const fav = favorites.find(f => f.id === value || (f as any).recording_id === value)
    if (fav) handlePlayRecording(fav)
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Build segmented toggle options from favorites
  const favOptions = favorites.map(f => ({
    value: f.id,
    label: f.display_name || 'مستخدم',
  }))

  return (
    <>
      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)] border-t border-stone-200 rounded-t-2xl">
        {/* Thin progress bar at top */}
        <ProgressBar
          value={player.currentTime}
          max={player.duration || 1}
          thin
          className="rounded-none"
        />

        <div className="h-[72px] px-4 flex items-center gap-3 max-w-3xl mx-auto">
          {/* Play/Pause button */}
          <button
            onClick={handlePlayDefault}
            disabled={!currentRecording || loading}
            className="w-12 h-12 flex-shrink-0 rounded-full bg-emerald-700 text-white flex items-center justify-center hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={player.isPlaying ? 'إيقاف' : 'تشغيل'}
          >
            {player.isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ms-0.5" />
            )}
          </button>

          {/* Recording info */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="h-4 w-24 bg-stone-200 rounded animate-pulse" />
            ) : currentRecording ? (
              <>
                <div className="flex items-center gap-1.5 text-sm font-medium text-stone-900 truncate">
                  <span className="truncate">{currentRecording.display_name || 'قارئ'}</span>
                  {currentRecording.is_verified && (
                    <BadgeCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" aria-label="معتمد" />
                  )}
                </div>
                {/* Favorite segmented toggle */}
                {favOptions.length > 1 && (
                  <SegmentedToggle
                    options={favOptions}
                    value={selectedFavorite}
                    onChange={handleFavoriteChange}
                    className="mt-1"
                  />
                )}
              </>
            ) : (
              <span className="text-sm text-stone-500">لا توجد تسجيلات</span>
            )}
          </div>

          {/* Recording count and drag handle */}
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-sm font-medium hover:bg-stone-200 transition-colors"
            aria-label="فتح قائمة التسجيلات"
          >
            <Volume2 className="w-4 h-4" />
            <span>{allRecordings.length || defaultRecording ? '🎙️ تسجيلات' : '🎙️ 0'}</span>
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>

        {/* Time indicator */}
        {player.isPlaying && (
          <div className="absolute top-0.5 start-0 text-xs text-stone-400 font-mono px-1" dir="ltr">
            {formatDuration(player.currentTime)} / {formatDuration(player.duration)}
          </div>
        )}
      </div>

      {/* Recordings sheet */}
      <RecordingsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        hadithId={hadithId}
        activeRecordingId={currentRecording?.id || null}
        onPlayRecording={handlePlayRecording}
        onAddRecording={handleAddRecording}
        uploadEnabled={uploadEnabled}
        canRecord={!!user}
      />

      {/* Consent modal */}
      <ConsentModal
        open={consentOpen}
        onClose={() => setConsentOpen(false)}
        onConsent={handleConsentGiven}
      />

      {/* Recorder modal */}
      <RecorderModal
        open={recorderOpen}
        onClose={() => setRecorderOpen(false)}
        hadithId={hadithId}
        onUploaded={() => {
          setRecorderOpen(false)
          fetchDefault()
        }}
      />

      {/* Bottom padding spacer for the fixed bar */}
      <div className="h-[72px]" />
    </>
  )
}
