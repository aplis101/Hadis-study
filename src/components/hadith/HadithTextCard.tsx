'use client'

import { useState } from 'react'
import type { Hadith, WordDefinition } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { WordDefinitionPopup } from './WordDefinitionPopup'

interface HadithTextCardProps {
  hadith: Hadith
}

const gradeConfig: Record<string, { label: string; variant: 'sahih' | 'hasan' | 'daif' | 'default' }> = {
  sahih: { label: 'صحيح', variant: 'sahih' },
  hasan: { label: 'حسن', variant: 'hasan' },
  daif: { label: 'ضعيف', variant: 'daif' },
}

export function HadithTextCard({ hadith }: HadithTextCardProps) {
  const [selectedWord, setSelectedWord] = useState<WordDefinition | null>(null)

  const grade = gradeConfig[hadith.grade] || { label: hadith.grade, variant: 'default' as const }

  // Build matn with interactive word definitions
  const renderMatn = () => {
    if (!hadith.word_definitions?.length) {
      return <span>{hadith.matn_ar}</span>
    }

    // Sort definitions by word length descending to match larger words first
    const sorted = [...hadith.word_definitions].sort((a, b) => b.word.length - a.word.length)
    let text = hadith.matn_ar

    const parts: { text: string; def?: WordDefinition }[] = []
    let remaining = text

    while (remaining.length > 0) {
      let match: { index: number; def: WordDefinition } | null = null
      for (const def of sorted) {
        const idx = remaining.indexOf(def.word)
        if (idx !== -1) {
          if (match === null || idx < match.index) {
            match = { index: idx, def }
          }
        }
      }

      if (match) {
        if (match.index > 0) {
          parts.push({ text: remaining.slice(0, match.index) })
        }
        parts.push({ text: match.def.word, def: match.def })
        remaining = remaining.slice(match.index + match.def.word.length)
      } else {
        parts.push({ text: remaining })
        remaining = ''
      }
    }

    return (
      <>
        {parts.map((part, i) =>
          part.def ? (
            <button
              key={i}
              className="text-stone-900 underline underline-offset-4 decoration-emerald-700 decoration-dotted cursor-pointer hover:text-emerald-700 transition-colors"
              onClick={() => setSelectedWord(part.def!)}
              aria-label={`معنى كلمة ${part.def.word}`}
            >
              {part.text}
            </button>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        {/* Isnad */}
        {hadith.isnad_ar && (
          <div className="bg-stone-100 px-5 py-4 border-b border-stone-200">
            <p className="font-[Amiri] text-lg leading-relaxed text-stone-500" dir="rtl">
              {hadith.isnad_ar}
            </p>
          </div>
        )}

        {/* Matn */}
        <div className="px-5 py-6">
          <div className="font-[Amiri] text-2xl leading-loose text-stone-900" dir="rtl">
            {renderMatn()}
          </div>

          {/* Grade */}
          <div className="mt-5">
            <Badge variant={grade.variant}>{grade.label}</Badge>
          </div>
        </div>
      </div>

      {/* Word definition popup */}
      {selectedWord && (
        <WordDefinitionPopup
          definition={selectedWord}
          onClose={() => setSelectedWord(null)}
        />
      )}
    </>
  )
}
