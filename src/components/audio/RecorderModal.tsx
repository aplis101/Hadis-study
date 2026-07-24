'use client'

import { useState, useRef, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { ReplaceConfirmModal } from './ReplaceConfirmModal'
import { Mic, Square, Play, Pause, RotateCcw, Upload, CheckCircle, AlertCircle } from 'lucide-react'

type RecorderState = 'ready' | 'recording' | 'preview' | 'uploading' | 'success' | 'error'

interface RecorderModalProps {
  open: boolean
  onClose: () => void
  hadithId: string
  onUploaded?: () => void
}

const MAX_DURATION = 180 // 3 minutes max
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export function RecorderModal({ open, onClose, hadithId, onUploaded }: RecorderModalProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [state, setState] = useState<RecorderState>('ready')
  const [timer, setTimer] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [hasExisting, setHasExisting] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  // Check for existing recording
  useEffect(() => {
    if (!open) return
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('recordings')
        .select('id')
        .eq('hadith_id', hadithId)
        .eq('user_id', user.id)
        .maybeSingle()
      setHasExisting(!!data)
    }
    check()
  }, [open, hadithId, supabase])

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      cleanup()
    }
  }, [open])

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current = null
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setState('ready')
    setTimer(0)
    setAudioUrl(null)
    setAudioBlob(null)
    setUploadProgress(0)
    setErrorMsg('')
    chunksRef.current = []
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Prefer Opus codec
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : {}

      const recorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        if (blob.size > MAX_SIZE) {
          setErrorMsg('حجم التسجيل يتجاوز الحد المسموح (5MB)')
          setState('ready')
          return
        }
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        setState('preview')
      }

      recorder.start(1000) // Get data every second for chunks
      setState('recording')
      setTimer(0)

      // Timer
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev >= MAX_DURATION) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)
    } catch (err) {
      setErrorMsg('تعذّر الوصول إلى الميكروفون. تأكد من الإذن.')
      setState('error')
    }
  }

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  const uploadRecording = async () => {
    if (!audioBlob) return

    if (hasExisting) {
      setReplaceOpen(true)
      return
    }

    await doUpload()
  }

  const handleReplaceConfirm = async () => {
    setReplaceOpen(false)
    await doUpload(true)
  }

  const doUpload = async (replace = false) => {
    setState('uploading')
    setUploadProgress(0)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      showToast('يجب تسجيل الدخول أولاً', 'error')
      return
    }

    // Create file path
    const filePath = `audio/hadith_${hadithId}/user_${user.id}.opus`

    // Upload to storage
    setUploadProgress(30)
    const { error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(filePath, audioBlob!, {
        contentType: audioBlob!.type,
        upsert: replace,
      })

    if (uploadError) {
      setErrorMsg(uploadError.message)
      setState('error')
      return
    }

    setUploadProgress(60)

    // Get file URL
    const { data: urlData } = supabase.storage
      .from('recordings')
      .getPublicUrl(filePath)

    setUploadProgress(80)

    // Create recording record
    const rpcName = replace ? 'replace_recording' : 'create_recording'
    const { error: rpcError } = await supabase.rpc(rpcName, {
      p_hadith_id: hadithId,
      p_file_path: filePath,
      p_duration_seconds: timer,
      p_file_size_bytes: audioBlob!.size,
      p_codec: audioBlob!.type.includes('opus') ? 'opus' : 'aac',
      p_bitrate_kbps: 32,
    })

    if (rpcError) {
      setErrorMsg(rpcError.message)
      setState('error')
      // Cleanup uploaded file on error
      await supabase.storage.from('recordings').remove([filePath])
      return
    }

    setUploadProgress(100)
    setState('success')
    showToast('تم نشر تسجيلك بنجاح', 'success')
    onUploaded?.()
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleClose = () => {
    cleanup()
    onClose()
  }

  const previewPlaying = previewAudioRef.current && !previewAudioRef.current.paused

  const togglePreview = () => {
    if (!previewAudioRef.current && audioUrl) {
      previewAudioRef.current = new Audio(audioUrl)
      previewAudioRef.current.onended = () => {}
    }
    if (previewAudioRef.current?.paused) {
      previewAudioRef.current.play()
    } else {
      previewAudioRef.current?.pause()
    }
    // Force re-render
    setState(prev => prev)
  }

  return (
    <>
      <Modal open={open} onClose={handleClose} title="تسجيل صوتي">
        {state === 'ready' && (
          <div className="flex flex-col items-center py-8">
            <button
              onClick={startRecording}
              className="w-24 h-24 rounded-full border-4 border-emerald-700 flex items-center justify-center hover:bg-emerald-50 transition-colors"
              aria-label="بدء التسجيل"
            >
              <Mic className="w-10 h-10 text-emerald-700" />
            </button>
            <p className="mt-4 text-sm text-stone-600">اضغط للبدء</p>
            <p className="text-xs text-stone-400 mt-1">حتى {MAX_DURATION} ثانية</p>
          </div>
        )}

        {state === 'recording' && (
          <div className="flex flex-col items-center py-8">
            <button
              onClick={stopRecording}
              className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center recording-pulse"
              aria-label="إيقاف التسجيل"
            >
              <Square className="w-8 h-8 text-white" />
            </button>
            <p className="mt-4 text-2xl font-mono font-bold text-stone-900" dir="ltr">
              {formatTime(timer)}
            </p>
            <p className="text-xs text-stone-400 mt-1">جاري التسجيل...</p>
            <Button variant="ghost" size="sm" onClick={cleanup} className="mt-4">
              <RotateCcw className="w-4 h-4" />
              إلغاء
            </Button>
          </div>
        )}

        {state === 'preview' && (
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={togglePreview}
                className="w-16 h-16 rounded-full bg-emerald-700 flex items-center justify-center hover:bg-emerald-800 transition-colors"
                aria-label={previewPlaying ? 'إيقاف المعاينة' : 'تشغيل المعاينة'}
              >
                {previewPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ms-0.5" />}
              </button>
            </div>
            <p className="text-center text-lg font-mono" dir="ltr">{formatTime(timer)}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={cleanup}>
                <RotateCcw className="w-4 h-4" />
                إعادة التسجيل
              </Button>
              <Button onClick={uploadRecording}>
                <Upload className="w-4 h-4" />
                نشر
              </Button>
            </div>
          </div>
        )}

        {state === 'uploading' && (
          <div className="flex flex-col items-center py-8">
            <Upload className="w-12 h-12 text-emerald-700 mb-4 animate-bounce" />
            <p className="text-sm text-stone-600 mb-3">جاري رفع التسجيل...</p>
            <ProgressBar value={uploadProgress} max={100} className="max-w-xs" />
            <p className="text-xs text-stone-400 mt-2 font-mono" dir="ltr">{uploadProgress}%</p>
          </div>
        )}

        {state === 'success' && (
          <div className="flex flex-col items-center py-8">
            <CheckCircle className="w-12 h-12 text-emerald-700 mb-4" />
            <p className="text-sm text-stone-700 font-medium">تم نشر التسجيل بنجاح</p>
            <Button variant="secondary" onClick={handleClose} className="mt-4">
              إغلاق
            </Button>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center py-8">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-sm text-red-600 font-medium text-center">{errorMsg}</p>
            <Button variant="secondary" onClick={cleanup} className="mt-4">
              إعادة المحاولة
            </Button>
          </div>
        )}
      </Modal>

      <ReplaceConfirmModal
        open={replaceOpen}
        onClose={() => setReplaceOpen(false)}
        onConfirm={handleReplaceConfirm}
      />
    </>
  )
}
