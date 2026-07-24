'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface MediaRecorderState {
  isSupported: boolean;
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  blob: Blob | null;
  error: string | null;
  permission: 'prompt' | 'granted' | 'denied' | 'unknown';
}

export function useMediaRecorder() {
  const [state, setState] = useState<MediaRecorderState>({
    isSupported: false,
    isRecording: false,
    isPaused: false,
    duration: 0,
    blob: null,
    error: null,
    permission: 'unknown',
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isSupported:
        typeof navigator !== 'undefined' &&
        'MediaRecorder' in navigator &&
        'navigator' in window,
    }));
  }, []);

  const checkPermission = useCallback(async () => {
    try {
      const result = await navigator.mediaDevices.getUserMedia({ audio: true });
      result.getTracks().forEach((t) => t.stop());
      setState((prev) => ({ ...prev, permission: 'granted' }));
    } catch {
      setState((prev) => ({ ...prev, permission: 'denied' }));
    }
  }, []);

  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setState((prev) => ({
        ...prev,
        duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
      }));
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState((prev) => ({ ...prev, duration: 0 }));
  };

  const start = useCallback(async (maxDuration?: number) => {
    setState((prev) => ({ ...prev, error: null, blob: null }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setState((prev) => ({ ...prev, blob, isRecording: false }));
        stream.getTracks().forEach((t) => t.stop());
        stopTimer();
      };

      recorder.onerror = () => {
        setState((prev) => ({
          ...prev,
          error: 'حدث خطأ في التسجيل',
          isRecording: false,
        }));
        stream.getTracks().forEach((t) => t.stop());
        stopTimer();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      startTimer();

      if (maxDuration && maxDuration > 0) {
        setTimeout(() => {
          if (recorder.state === 'recording') recorder.stop();
        }, maxDuration * 1000);
      }

      setState((prev) => ({ ...prev, isRecording: true, isPaused: false, permission: 'granted' }));
    } catch {
      setState((prev) => ({
        ...prev,
        error: 'تعذّر الوصول إلى الميكروفون',
        permission: 'denied',
      }));
    }
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setState((prev) => ({ ...prev, isPaused: true }));
    }
  }, []);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      startTimer();
      setState((prev) => ({ ...prev, isPaused: false }));
    }
  }, []);

  const reset = useCallback(() => {
    stopTimer();
    chunksRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setState((prev) => ({
      ...prev,
      isRecording: false,
      isPaused: false,
      duration: 0,
      blob: null,
      error: null,
    }));
  }, [stopTimer]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    ...state,
    start,
    stop,
    pause,
    resume,
    reset,
    checkPermission,
  };
}
