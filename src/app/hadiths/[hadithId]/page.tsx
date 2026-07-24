'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Hadith } from '@/types'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { PageContainer } from '@/components/layout/PageContainer'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { HadithTextCard } from '@/components/hadith/HadithTextCard'
import { TakhrijList } from '@/components/hadith/TakhrijList'
import { ContentReportForm } from '@/components/hadith/ContentReportForm'
import { AudioBottomBar } from '@/components/audio/AudioBottomBar'
import { AlertCircle, BookMarked, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

export default function HadithPage() {
  const params = useParams()
  const hadithId = params.hadithId as string
  const supabase = createClient()

  const [hadith, setHadith] = useState<Hadith | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [takhrijOpen, setTakhrijOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [explanationOpen, setExplanationOpen] = useState(false)

  const fetchHadith = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('hadiths')
      .select('*, word_definitions(*), takhrij_references(*)')
      .eq('id', hadithId)
      .single()

    if (err) {
      setError(err.message)
    } else {
      setHadith(data as Hadith)
    }
    setLoading(false)
  }, [hadithId, supabase])

  useEffect(() => {
    fetchHadith()
  }, [fetchHadith])

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl mb-4" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </PageContainer>
    )
  }

  if (error || !hadith) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
          <p className="text-sm text-stone-600 mb-3">{error || 'الحديث غير موجود'}</p>
          <Button variant="secondary" onClick={fetchHadith}>إعادة المحاولة</Button>
        </div>
      </PageContainer>
    )
  }

  return (
    <>
      <PageContainer>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'المجموعات', href: '/' },
            { label: 'الحديث', href: `/hadiths/${hadithId}` },
          ]}
        />

        {/* Hadith number */}
        <p className="text-sm text-stone-500 mb-3" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
          الحديث رقم {hadith.hadith_number}
        </p>

        {/* 1. Hadith Text Card - including Isnad, Matn, Grade */}
        <HadithTextCard hadith={hadith} />

        {/* 2. Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant="ghost" onClick={() => setTakhrijOpen(true)}>
            <BookMarked className="w-4 h-4" />
            التخريج
          </Button>
          <Button variant="ghost" onClick={() => setReportOpen(true)}>
            <AlertTriangle className="w-4 h-4" />
            ⚠️ الإبلاغ عن خطأ في النص
          </Button>
        </div>

        {/* 3. Indonesian Translation */}
        {hadith.translation_id && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-stone-700 mb-2">الترجمة الإندونيسية</h3>
            <div
              className="bg-white rounded-xl border border-stone-200 p-4"
              dir="ltr"
              lang="id"
              style={{ unicodeBidi: 'isolate' }}
            >
              <p className="text-sm leading-relaxed text-stone-700 font-[Inter]">
                {hadith.translation_id}
              </p>
            </div>
          </div>
        )}

        {/* 4. Explanation */}
        {hadith.explanation_ar && (
          <div className="mt-6">
            <button
              className="w-full flex items-center justify-between bg-white rounded-xl border border-stone-200 p-4 text-start hover:bg-stone-50 transition-colors"
              onClick={() => setExplanationOpen(!explanationOpen)}
            >
              <span className="text-sm font-semibold text-stone-900">الشرح الميسر</span>
              {explanationOpen ? (
                <ChevronUp className="w-5 h-5 text-stone-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-stone-400" />
              )}
            </button>
            {explanationOpen && (
              <div className="bg-stone-50 rounded-b-xl border border-t-0 border-stone-200 p-4">
                <p className="text-sm leading-relaxed text-stone-700 font-[Amiri]" dir="rtl">
                  {hadith.explanation_ar}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Spacer for fixed bottom bar */}
        <div className="h-20" />
      </PageContainer>

      {/* Takhrij Modal */}
      <TakhrijList
        open={takhrijOpen}
        onClose={() => setTakhrijOpen(false)}
        references={hadith.takhrij_references || []}
      />

      {/* Content Report Modal */}
      <ContentReportForm
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        hadithId={hadithId}
      />

      {/* 5. Audio Bottom Bar */}
      <AudioBottomBar hadithId={hadithId} />
    </>
  )
}
