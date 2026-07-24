'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AudioPlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  progress: number
  isLoading: boolean
  buffered: number
}

export function useAudioPlayer() {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    progress: 0,
    isLoading: false,
    buffered: 0,
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recordingIdRef = useRef<string | null>(null)
  const listenCountedRef = useRef(false)

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    const onTimeUpdate = () => {
      if (!audio) return
      setState((prev) => ({
        ...prev,
        currentTime: audio.currentTime,
        progress: audio.duration ? audio.currentTime / audio.duration : 0,
      }))

      // ALG-003: count listen after 5 seconds
      if (recordingIdRef.current && audio.currentTime >= 5 && !listenCountedRef.current) {
        listenCountedRef.current = true
        const supabase = createClient()
        supabase.rpc('register_listen', { p_recording_id: recordingIdRef.current }).then()
      }
    }

    const onLoadedMetadata = () => {
      if (!audio) return
      setState((prev) => ({
        ...prev,
        duration: audio.duration,
        isLoading: false,
      }))
    }

    const onEnded = () => {
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        currentTime: 0,
        progress: 0,
      }))
    }

    const onWaiting = () => setState((prev) => ({ ...prev, isLoading: true }))
    const onCanPlay = () => setState((prev) => ({ ...prev, isLoading: false }))
    const onProgress = () => {
      if (audio.buffered.length > 0) {
        setState((prev) => ({
          ...prev,
          buffered: audio.buffered.end(audio.buffered.length - 1),
        }))
      }
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('progress', onProgress)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('progress', onProgress)
      audio.pause()
      audio.src = ''
    }
  }, [])

  const load = useCallback((url: string, recordingId?: string) => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = url
    audio.load()
    recordingIdRef.current = recordingId || null
    listenCountedRef.current = false
    setState((prev) => ({ ...prev, isLoading: true }))
  }, [])

  const play = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.play().then(() => {
      setState((prev) => ({ ...prev, isPlaying: true }))
    })
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setState((prev) => ({ ...prev, isPlaying: false }))
  }, [])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      play()
    } else {
      pause()
    }
  }, [play, pause])

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }, [])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    recordingIdRef.current = null
    listenCountedRef.current = false
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
      progress: 0,
    }))
  }, [])

  return {
    ...state,
    audioRef,
    load,
    play,
    pause,
    toggle,
    seek,
    stop,
    currentRecordingId: recordingIdRef.current,
  }
}
