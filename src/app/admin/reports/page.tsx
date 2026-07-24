'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ReportQueueItem } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { ReportDetailDrawer } from '@/components/admin/ReportDetailDrawer'
import { Flag, AlertCircle, Play, CheckCircle } from 'lucide-react'

const statusFilters = [
  { value: 'open', label: 'مفتوحة' },
  { value: 'all', label: 'الكل' },
  { value: 'auto_hidden', label: 'مخفي تلقائياً' },
  { value: 'resolved', label: 'معالَجة' },
]

export default function AdminReportsPage() {
  const supabase = createClient()
  const [items, setItems] = useState<ReportQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('open')
  const [selectedItem, setSelectedItem] = useState<ReportQueueItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: rpcError } = await supabase.rpc(
      'admin_list_recordings_queue',
      filter === 'all' ? {} : { p_status: filter === 'auto_hidden' ? 'open' : filter }
    )

    if (rpcError) {
      setError(rpcError.message)
    } else if (data?.queue) {
      setItems(data.queue)
    } else {
      setItems([])
    }
    setLoading(false)
  }, [supabase, filter])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  const openDrawer = (item: ReportQueueItem) => {
    setSelectedItem(item)
    setDrawerOpen(true)
  }

  const handleAction = () => {
    fetchQueue()
  }

  return (
    <PageContainer maxWidth="max-w-5xl">
      <h1 className="text-xl font-bold text-stone-900 mb-1">بلاغات الصوت</h1>
      <p className="text-sm text-stone-500 mb-4">مراجعة وإدارة البلاغات على التسجيلات الصوتية</p>

      <FilterTabs tabs={statusFilters} value={filter} onChange={setFilter} className="mb-4" />

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" count={5} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
          <p className="text-sm text-stone-600 mb-3">{error}</p>
          <Button variant="secondary" onClick={fetchQueue}>إعادة المحاولة</Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CheckCircle className="w-12 h-12 text-emerald-400" />}
          title="لا توجد بلاغات"
          description="كل شيء تحت السيطرة ✅"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-100 text-stone-700">
                <th className="text-end px-4 py-3 font-semibold">التسجيل</th>
                <th className="text-end px-4 py-3 font-semibold">الحديث</th>
                <th className="text-end px-4 py-3 font-semibold">صاحب التسجيل</th>
                <th className="text-end px-4 py-3 font-semibold">البلاغات</th>
                <th className="text-end px-4 py-3 font-semibold">الحالة</th>
                <th className="text-end px-4 py-3 font-semibold">أقدم بلاغ</th>
                <th className="text-end px-4 py-3 font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.recording_id}
                  className="border-t border-stone-200 hover:bg-emerald-50 transition-colors cursor-pointer"
                  onClick={() => openDrawer(item)}
                >
                  <td className="px-4 py-3">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <Play className="w-3 h-3" /> استماع
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-700 max-w-[200px] truncate">
                    {item.hadith_excerpt}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-stone-900 text-xs font-medium">{item.owner_real_name}</div>
                    <div className="text-stone-400 text-xs" dir="ltr">{item.owner_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-stone-900" dir="ltr">{item.report_count}</span>
                    <div className="text-xs text-stone-400">{item.reasons?.join('، ')}</div>
                  </td>
                  <td className="px-4 py-3">
                    {item.is_hidden ? (
                      <Badge variant="daif">مخفي</Badge>
                    ) : item.is_verified ? (
                      <Badge variant="verified">معتمد</Badge>
                    ) : (
                      <Badge>ظاهر</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs" dir="ltr">
                    {new Date(item.oldest_report_at).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openDrawer(item) }}>
                      فتح
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail drawer */}
      <ReportDetailDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedItem(null) }}
        item={selectedItem}
        onAction={handleAction}
      />
    </PageContainer>
  )
}
