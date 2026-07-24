'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ContentReport } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { useToast } from '@/components/ui/Toast'
import { AlertTriangle, CheckCircle, AlertCircle, User, Mail } from 'lucide-react'

const statusMap: Record<string, { label: string; variant: 'sahih' | 'hasan' | 'daif' | 'default' | 'verified' }> = {
  open: { label: 'مفتوح', variant: 'daif' },
  in_progress: { label: 'قيد المعالجة', variant: 'hasan' },
  resolved: { label: 'تم الحل', variant: 'sahih' },
  dismissed: { label: 'مرفوض', variant: 'default' },
}

const errorTypeLabels: Record<string, string> = {
  tashkeel: 'تشكيل',
  translation: 'ترجمة',
  isnad: 'إسناد',
  takhrij: 'تخريج',
  other: 'أخرى',
}

export default function AdminContentReportsPage() {
  const supabase = createClient()
  const { showToast } = useToast()
  const [reports, setReports] = useState<(ContentReport & { reporter_name?: string; reporter_email?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('content_reports')
      .select('*, profiles!reporter_id(display_name, email)')
      .order('created_at', { ascending: false })

    if (err) {
      setError(err.message)
    } else if (data) {
      setReports(
        data.map((r: any) => ({
          ...r,
          reporter_name: r.profiles?.display_name,
          reporter_email: r.profiles?.email,
        }))
      )
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const handleStatusChange = async (reportId: string, status: string) => {
    setActionLoading(reportId)
    const { error: rpcError } = await supabase.rpc('admin_resolve_content_report', {
      p_report_id: reportId,
      p_status: status,
    })
    setActionLoading(null)

    if (rpcError) {
      showToast(rpcError.message || 'تعذّر تحديث الحالة', 'error')
    } else {
      showToast('تم تحديث الحالة', 'success')
      fetchReports()
    }
  }

  return (
    <PageContainer maxWidth="max-w-5xl">
      <h1 className="text-xl font-bold text-stone-900 mb-1">بلاغات المحتوى</h1>
      <p className="text-sm text-stone-500 mb-6">مراجعة البلاغات على أخطاء النص والترجمة والإسناد والتخريج</p>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" count={5} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
          <p className="text-sm text-stone-600 mb-3">{error}</p>
          <Button variant="secondary" onClick={fetchReports}>إعادة المحاولة</Button>
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<CheckCircle className="w-12 h-12 text-emerald-400" />}
          title="لا توجد بلاغات محتوى"
          description="كل شيء تحت السيطرة ✅"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-100 text-stone-700">
                <th className="text-end px-4 py-3 font-semibold">الحديث</th>
                <th className="text-end px-4 py-3 font-semibold">نوع الخطأ</th>
                <th className="text-end px-4 py-3 font-semibold">الوصف</th>
                <th className="text-end px-4 py-3 font-semibold">المبلّغ</th>
                <th className="text-end px-4 py-3 font-semibold">التاريخ</th>
                <th className="text-end px-4 py-3 font-semibold">الحالة</th>
                <th className="text-end px-4 py-3 font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const statusInfo = statusMap[report.status] || statusMap.open
                return (
                  <tr key={report.id} className="border-t border-stone-200 hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-emerald-700 text-xs hover:underline cursor-pointer">
                        فتح الحديث
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default">{errorTypeLabels[report.error_type] || report.error_type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-stone-600 max-w-[200px] truncate">
                      {report.description}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs">
                        <User className="w-3 h-3 text-stone-400" />
                        <span className="text-stone-700">{report.reporter_name || '---'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs" dir="ltr">
                      {new Date(report.created_at).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStatusChange(report.id, 'in_progress')}
                          loading={actionLoading === report.id}
                          disabled={report.status === 'in_progress'}
                        >
                          قيد المعالجة
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStatusChange(report.id, 'resolved')}
                          loading={actionLoading === report.id}
                          disabled={report.status === 'resolved'}
                        >
                          تم الحل
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStatusChange(report.id, 'dismissed')}
                          loading={actionLoading === report.id}
                          disabled={report.status === 'dismissed'}
                        >
                          مرفوض
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  )
}
