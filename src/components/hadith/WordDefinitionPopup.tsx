'use client'

import type { WordDefinition } from '@/types'
import { Popup } from '@/components/ui/Popup'
import { Volume2 } from 'lucide-react'

interface WordDefinitionPopupProps {
  definition: WordDefinition
  onClose: () => void
}

export function WordDefinitionPopup({ definition, onClose }: WordDefinitionPopupProps) {
  const playAudio = () => {
    if (definition.audio_url) {
      const audio = new Audio(definition.audio_url)
      audio.play()
    }
  }

  return (
    <Popup open={!!definition} onClose={onClose}>
      <div className="text-center">
        <h3 className="font-[Amiri] text-2xl text-stone-900 mb-3" dir="rtl">
          {definition.word}
        </h3>
        <p className="text-sm text-stone-700 leading-relaxed mb-1" dir="rtl">
          {definition.meaning_ar}
        </p>
        {definition.meaning_id && (
          <p className="text-sm text-stone-500 leading-relaxed" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
            {definition.meaning_id}
          </p>
        )}
        {definition.audio_url && (
          <button
            onClick={playAudio}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors"
            aria-label="استماع للنطق"
          >
            <Volume2 className="w-4 h-4" />
            استماع
          </button>
        )}
      </div>
    </Popup>
  )
}
