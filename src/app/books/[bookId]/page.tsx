'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Book, Chapter, Hadith } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { BookOpen, AlertCircle, ChevronDown, ChevronLeft, Book as BookIcon, Mic } from 'lucide-react'

const gradeConfig: Record<string, { label: string; variant: 'sahih' | 'hasan' | 'daif' | 'default' }> = {
  sahih: { label: 'صحيح', variant: 'sahih' },
  hasan: { label: 'حسن', variant: 'hasan' },
  daif: { label: 'ضعيف', variant: 'daif' },
}

export default function ChaptersPage() {
  const params = useParams()
  const bookId = params.bookId as string
  const supabase = createClient()

  const [book, setBook] = useState<Book | null>(null)
  const [collection, setCollection] = useState<{ id: number; name_ar: string } | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null)
  const [hadiths, setHadiths] = useState<Hadith[]>([])
  const [loading, setLoading] = useState(true)
  const [hadithsLoading, setHadithsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: bk, error: bkErr } = await supabase
      .from('books')
      .select('*, collections(id, name_ar)')
      .eq('id', bookId)
      .single()

    if (bkErr) {
      setError(bkErr.message)
      setLoading(false)
      return
    }
    setBook(bk)
    setCollection(bk.collections as any)

    const { data: chs, error: chErr } = await supabase
      .from('chapters')
      .select('*')
      .eq('book_id', bookId)
      .order('sort_order', { ascending: true })

    if (chErr) {
      setError(chErr.message)
    } else {
      setChapters(chs || [])
    }
    setLoading(false)
  }, [bookId, supabase])

  const fetchHadiths = useCallback(async (chapterId: number) => {
    setHadithsLoading(true)
    const { data, error: hErr } = await supabase
      .from('hadiths')
      .select('id, hadith_number, matn_ar, grade')
      .eq('chapter_id', chapterId)
      .order('hadith_number', { ascending: true })

    if (!hErr) {
      setHadiths((data || []) as Hadith[])
    }
    setHadithsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleChapterClick = (chapterId: number) => {
    if (selectedChapterId === chapterId) {
      setSelectedChapterId(null)
      setHadiths([])
    } else {
      setSelectedChapterId(chapterId)
      fetchHadiths(chapterId)
    }
  }

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: 'المجموعات', href: '/' },
          { label: collection?.name_ar || '...', href: `/collections/${collection?.id}` },
          { label: book?.name_ar || '...' },
        ]}
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" count={5} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
          <p className="text-sm text-stone-600 mb-3">{error}</p>
          <Button variant="secondary" onClick={fetchData}>إعادة المحاولة</Button>
        </div>
      ) : chapters.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-12 h-12" />}
          title="لا توجد أبواب في هذا الكتاب"
        />
      ) : (
        <div className="space-y-2">
          {chapters.map((chapter) => (
            <div key={chapter.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {/* Chapter header */}
              <button
                className="w-full flex items-center justify-between p-4 text-start hover:bg-stone-50 transition-colors"
                onClick={() => handleChapterClick(chapter.id)}
              >
                <div className="flex items-center gap-3">
                  <BookIcon className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-stone-900">{chapter.name_ar}</span>
                    <p className="text-xs text-stone-500 mt-0.5">
                      <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{chapter.hadiths_count ?? 0}</span> حديثاً
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-stone-400 transition-transform ${
                    selectedChapterId === chapter.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Hadith list */}
              {selectedChapterId === chapter.id && (
                <div className="border-t border-stone-200 bg-stone-50">
                  {hadithsLoading ? (
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-14 w-full rounded-lg" count={3} />
                    </div>
                  ) : hadiths.length === 0 ? (
                    <div className="p-6 text-center text-sm text-stone-500">
                      لا يوجد محتوى في هذا الباب بعد
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-200">
                      {hadiths.map((hadith) => {
                        const grade = gradeConfig[hadith.grade] || { label: hadith.grade, variant: 'default' as const }
                        return (
                          <Link
                            key={hadith.id}
                            href={`/hadiths/${hadith.id}`}
                            className="flex items-center gap-3 p-4 hover:bg-emerald-50 transition-colors"
                          >
                            <span
                              className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold flex-shrink-0"
                              dir="ltr"
                            >
                              {hadith.hadith_number}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-stone-700 line-clamp-2 leading-relaxed font-[Amiri]">
                                {hadith.matn_ar}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant={grade.variant}>{grade.label}</Badge>
                              <ChevronLeft className="w-4 h-4 text-stone-300" />
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
