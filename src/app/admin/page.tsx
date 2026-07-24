'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageContainer } from '@/components/layout/PageContainer'
import Link from 'next/link'
import { Flag, AlertTriangle, EyeOff, MicOff, ArrowLeft } from 'lucide-react'

interface DashboardCounts {
  openAudioReports: number
  openContentReports: number
  autoHiddenRecordings: number
  uploadEnabled: boolean
}

export default function AdminDashboard() {
  const supabase = createClient()
  const [counts, setCounts] = useState<DashboardCounts | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCounts = useCallback(async () => {
    setLoading(true)

    const [audioReports, contentReports, hidden, settings] = await Promise.all([
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('content_reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('recordings').select('*', { count: 'exact', head: true }).eq('is_hidden', true).eq('hidden_reason', 'auto_hidden_threshold'),
      supabase.from('app_settings').select('value').eq('key', 'upload_enabled').single(),
    ])

    setCounts({
      openAudioReports: audioReports.count ?? 0,
      openContentReports: contentReports.count ?? 0,
      autoHiddenRecordings: hidden.count ?? 0,
      uploadEnabled: settings?.data?.value ?? true,
    })
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  const summaryCards = counts
    ? [
        {
          label: 'بلاغات صوت مفتوحة',
          count: counts.openAudioReports,
          icon: Flag,
          href: '/admin/reports',
          highlight: counts.openAudioReports > 0,
        },
        {
          label: 'بلاغات محتوى مفتوحة',
          count: counts.openContentReports,
          icon: AlertTriangle,
          href: '/admin/content-reports',
          highlight: counts.openContentReports > 0,
        },
        {
          label: 'تسجيلات مخفية تلقائياً',
          count: counts.autoHiddenRecordings,
          icon: EyeOff,
          href: '/admin/reports',
          highlight: counts.autoHiddenRecordings > 0,
        },
        {
          label: 'حالة الرفع',
          count: counts.uploadEnabled ? 0 : 1,
          icon: MicOff,
          href: '/admin/settings',
          highlight: !counts.uploadEnabled,
          statusText: counts.uploadEnabled ? 'مفعّل' : 'معطّل',
          statusVariant: counts.uploadEnabled ? 'text-emerald-700' : 'text-red-600',
        },
      ]
    : []

  return (
    <PageContainer maxWidth="max-w-4xl">
      <h1 className="text-xl font-bold text-stone-900 mb-1">لوحة التحكم</h1>
      <p className="text-sm text-stone-500 mb-6">نظرة عامة على حالة المنصة</p>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 w-full rounded-xl" count={4} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {summaryCards.map((card, i) => {
            const Icon = card.icon
            return (
              <Link key={i} href={card.href}>
                <Card
                  className={`p-5 h-full transition-all hover:shadow-md ${
                    card.highlight ? 'ring-2 ring-amber-400' : ''
                  }`}
                  hover
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Icon className={`w-6 h-6 mt-0.5 ${card.highlight ? 'text-amber-600' : 'text-stone-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-stone-700">{card.label}</p>
                        {'statusText' in card ? (
                          <p className={`text-lg font-bold mt-1 ${card.statusVariant}`}>
                            {card.statusText}
                          </p>
                        ) : (
                          <p className="text-2xl font-bold text-stone-900 mt-1" dir="ltr">
                            {card.count}
                          </p>
                        )}
                      </div>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-stone-300 mt-1" />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </PageContainer>
  )
}
