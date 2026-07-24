'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Collection } from '@/types'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { BookOpen, AlertCircle, Book } from 'lucide-react'

export default function HomePage() {
  const supabase = createClient()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCollections = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('collections')
      .select('*')
      .order('sort_order', { ascending: true })

    if (err) {
      setError(err.message)
    } else {
      setCollections(data || [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  return (
    <PageContainer>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">المكتبة الحديثية</h1>
        <p className="text-sm text-stone-500 mt-1">تصفح مجموعات الأحاديث النبوية الشريفة</p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 w-full rounded-xl" count={4} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
          <p className="text-sm text-stone-600 mb-3">{error}</p>
          <Button variant="secondary" onClick={fetchCollections}>
            إعادة المحاولة
          </Button>
        </div>
      ) : collections.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-12 h-12" />}
          title="لا توجد مجموعات بعد"
          description="سيتم إضافة المجموعات الحديثية قريباً"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {collections.map((collection) => (
            <Link key={collection.id} href={`/collections/${collection.id}`}>
              <Card hover className="p-5 h-full">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-stone-900 text-lg mb-1">
                      {collection.name_ar}
                    </h2>
                    <p className="text-sm text-stone-500">
                      <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{collection.books_count ?? 0}</span> كتاباً
                    </p>
                  </div>
                  <Book className="w-5 h-5 text-stone-300 mt-1 flex-shrink-0" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
