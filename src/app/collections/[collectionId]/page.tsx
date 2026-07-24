'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Collection, Book } from '@/types'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { BookOpen, AlertCircle, Book as BookIcon } from 'lucide-react'

export default function BooksPage() {
  const params = useParams()
  const collectionId = params.collectionId as string
  const supabase = createClient()

  const [collection, setCollection] = useState<Collection | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: col, error: colErr } = await supabase
      .from('collections')
      .select('*')
      .eq('id', collectionId)
      .single()

    if (colErr) {
      setError(colErr.message)
      setLoading(false)
      return
    }
    setCollection(col)

    const { data: bks, error: bksErr } = await supabase
      .from('books')
      .select('*')
      .eq('collection_id', collectionId)
      .order('sort_order', { ascending: true })

    if (bksErr) {
      setError(bksErr.message)
    } else {
      setBooks(bks || [])
    }
    setLoading(false)
  }, [collectionId, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <PageContainer>
      {collection && (
        <Breadcrumb
          items={[
            { label: 'المجموعات', href: '/' },
            { label: collection.name_ar },
          ]}
        />
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 w-full rounded-xl" count={4} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
          <p className="text-sm text-stone-600 mb-3">{error}</p>
          <Button variant="secondary" onClick={fetchData}>إعادة المحاولة</Button>
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-12 h-12" />}
          title="لا توجد كتب في هذه المجموعة"
          description="سيتم إضافة الكتب قريباً"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {books.map((book) => (
            <Link key={book.id} href={`/books/${book.id}`}>
              <Card hover className="p-5 h-full">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <BookIcon className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-stone-900 text-base mb-1">
                      {book.name_ar}
                    </h2>
                    <p className="text-sm text-stone-500">
                      <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{book.chapters_count ?? 0}</span> باباً
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
