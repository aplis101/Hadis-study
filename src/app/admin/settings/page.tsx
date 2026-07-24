'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AppSetting } from '@/types'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageContainer } from '@/components/layout/PageContainer'
import { SettingCard } from '@/components/admin/SettingCard'
import { AlertTriangle } from 'lucide-react'

interface SettingConfig {
  key: string
  title: string
  description: string
  type: 'number' | 'boolean' | 'text'
  validation?: { min?: number; max?: number }
}

const settingConfigs: SettingConfig[] = [
  {
    key: 'report_alert_ratio',
    title: 'نسبة عتبة التنبيه',
    description: 'النسبة المئوية من الطلاب النشطين التي تؤدي لتنبيه (0.15 = 15%)',
    type: 'number',
    validation: { min: 0, max: 1 },
  },
  {
    key: 'report_alert_min',
    title: 'حد التنبيه الأدنى',
    description: 'الحد الأدنى المطلق للبلاغات قبل التنبيه',
    type: 'number',
    validation: { min: 1 },
  },
  {
    key: 'report_hide_ratio',
    title: 'نسبة عتبة الإخفاء',
    description: 'النسبة المئوية التي تؤدي للإخفاء التلقائي',
    type: 'number',
    validation: { min: 0, max: 1 },
  },
  {
    key: 'report_hide_min',
    title: 'حد الإخفاء الأدنى',
    description: 'الحد الأدنى المطلق للبلاغات قبل الإخفاء',
    type: 'number',
    validation: { min: 1 },
  },
  {
    key: 'community_best_min_likes',
    title: 'حد لايكات شارة "أفضل تسجيل"',
    description: 'عدد الإعجابات المطلوبة لظهور شارة أفضل تسجيل',
    type: 'number',
    validation: { min: 0 },
  },
  {
    key: 'active_users_window_days',
    title: 'نافذة الطلاب النشطين (أيام)',
    description: 'عدد الأيام الماضية التي تحدد الطالب النشط',
    type: 'number',
    validation: { min: 1, max: 365 },
  },
  {
    key: 'rate_limit_uploads_per_hour',
    title: 'حد الرفع في الساعة',
    description: 'الحد الأقصى لعدد التسجيلات لكل طالب في الساعة',
    type: 'number',
    validation: { min: 1, max: 100 },
  },
  {
    key: 'listen_count_threshold_seconds',
    title: 'عتبة الاستماع المحتسب (ثوانٍ)',
    description: 'عدد الثواني المتواصلة لاحتساب الاستماع',
    type: 'number',
    validation: { min: 1, max: 60 },
  },
]

export default function AdminSettingsPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [activeCount, setActiveCount] = useState<number>(0)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('app_settings').select('*')
    if (data) {
      const map: Record<string, any> = {}
      data.forEach((s: AppSetting) => { map[s.key] = s.value })
      setSettings(map)
    }

    // Get active students count for live preview
    const { data: countData } = await supabase.rpc('get_active_students_count')
    if (countData) setActiveCount(countData)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const getAlertRatio = () => {
    const ratio = Number(settings['report_alert_ratio'] ?? 0.15)
    const min = Number(settings['report_alert_min'] ?? 2)
    const threshold = Math.max(min, Math.ceil(activeCount * ratio))
    return { ratio, min, threshold }
  }

  const getHideRatio = () => {
    const ratio = Number(settings['report_hide_ratio'] ?? 0.4)
    const min = Number(settings['report_hide_min'] ?? 4)
    const threshold = Math.max(min, Math.ceil(activeCount * ratio))
    return { ratio, min, threshold }
  }

  return (
    <PageContainer maxWidth="max-w-3xl">
      <h1 className="text-xl font-bold text-stone-900 mb-1">الإعدادات</h1>
      <p className="text-sm text-stone-500 mb-6">تعديل إعدادات التطبيق والعتبات</p>

      {/* Upload toggle - prominent */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-900">
              رفع التسجيلات
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {settings['upload_enabled']
                ? 'الرفع مفعّل — الطلاب يستطيعون رفع التسجيلات'
                : 'الرفع متوقف — الطلاب يستطيعون الاستماع والتصفح فقط'}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings['upload_enabled'] === true || settings['upload_enabled'] === 'true'}
              onChange={async (e) => {
                const newVal = e.target.checked
                const { error } = await supabase.rpc('admin_update_setting', {
                  p_key: 'upload_enabled',
                  p_value: newVal,
                })
                if (!error) {
                  setSettings(prev => ({ ...prev, upload_enabled: newVal }))
                }
              }}
            />
            <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-700/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-700" />
          </label>
        </div>
        {!settings['upload_enabled'] && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              الرفع متوقف مؤقتاً — الطلاب يستطيعون الاستماع والتصفح فقط
            </p>
          </div>
        )}
      </Card>

      {/* Live threshold preview */}
      {settings['report_alert_ratio'] && (
        <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
          <h4 className="text-sm font-semibold text-emerald-800 mb-2">عرض مساعد — العتبات الفعلية</h4>
          <p className="text-xs text-emerald-700">
            الطلاب النشطون حالياً: <strong dir="ltr">{activeCount}</strong>
          </p>
          <p className="text-xs text-emerald-700 mt-1">
            عتبة التنبيه الفعلية: <strong dir="ltr">{getAlertRatio().threshold}</strong>
            {' '}(max({getAlertRatio().min}, {activeCount} × {getAlertRatio().ratio}))
          </p>
          <p className="text-xs text-emerald-700 mt-1">
            عتبة الإخفاء الفعلية: <strong dir="ltr">{getHideRatio().threshold}</strong>
            {' '}(max({getHideRatio().min}, {activeCount} × {getHideRatio().ratio}))
          </p>
        </div>
      )}

      {/* Settings cards */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" count={4} />
        </div>
      ) : (
        <div className="space-y-4">
          {settingConfigs.map((config) => (
            <SettingCard
              key={config.key}
              title={config.title}
              description={config.description}
              settingKey={config.key}
              value={settings[config.key] ?? ''}
              type={config.type}
              validation={config.validation}
            />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
