'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Recording } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { useToast } from '@/components/ui/Toast'
import { User, Mail, Shield, CheckCircle, XCircle, Mic, Trash2, LogOut, Play, Save } from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [recordings, setRecordings] = useState<(Recording & { hadith_excerpt?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      setProfile(prof as Profile)
      setDisplayName(prof?.display_name || '')

      // Load user recordings with hadith info
      const { data: recs } = await supabase
        .from('recordings')
        .select('*, hadiths!inner(matn_ar, hadith_number)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (recs) {
        setRecordings(
          recs.map((r: any) => ({
            ...r,
            hadith_excerpt: r.hadiths?.matn_ar?.slice(0, 80) + '...',
          }))
        )
      }

      setLoading(false)
    }
    load()
  }, [supabase, router])

  const handleSaveName = async () => {
    if (!displayName.trim() || displayName.length < 2) {
      showToast('اسم العرض يجب أن يكون بين 2-60 حرفاً', 'error')
      return
    }
    setSavingName(true)
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() })
      .eq('id', profile!.id)

    if (error) {
      showToast('تعذّر حفظ الاسم', 'error')
    } else {
      showToast('تم حفظ الاسم', 'success')
      setProfile(prev => prev ? { ...prev, display_name: displayName.trim() } : prev)
      setEditingName(false)
    }
    setSavingName(false)
  }

  const handleDeleteRecording = async (recordingId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التسجيل؟')) return
    const { error } = await supabase.rpc('delete_recording', {
      p_recording_id: recordingId,
    })
    if (!error) {
      setRecordings(prev => prev.filter(r => r.id !== recordingId))
      showToast('تم حذف التسجيل', 'success')
    } else {
      showToast(error.message || 'تعذّر الحذف', 'error')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleGiveConsent = async () => {
    const { error } = await supabase.rpc('give_upload_consent')
    if (error) {
      showToast(error.message, 'error')
    } else {
      setProfile(prev => prev ? { ...prev, consent_given_at: new Date().toISOString() } : prev)
      showToast('تم توثيق الموافقة', 'success')
    }
  }

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('ar-SA', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-40 w-full rounded-xl mb-4" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </PageContainer>
    )
  }

  if (!profile) return null

  return (
    <PageContainer>
      {/* Account card */}
      <Card className="p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7 text-emerald-700" />
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  maxLength={60}
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveName} loading={savingName}>
                  <Save className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setEditingName(false); setDisplayName(profile.display_name) }}>
                  إلغاء
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-stone-900">{profile.display_name}</h2>
                <button
                  className="text-xs text-emerald-600 hover:text-emerald-700"
                  onClick={() => setEditingName(true)}
                >
                  تعديل
                </button>
              </div>
            )}
            <Badge variant={profile.role === 'admin' ? 'verified' : 'default'} className="mt-1">
              <Shield className="w-3 h-3" />
              {profile.role === 'admin' ? 'مشرف' : 'طالب'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Consent status */}
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-900">حالة الموافقة على النشر</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {profile.consent_given_at
                ? `موثقة بتاريخ ${formatDate(profile.consent_given_at)}`
                : 'لم تمنح الموافقة بعد'}
            </p>
          </div>
          {profile.consent_given_at ? (
            <CheckCircle className="w-6 h-6 text-emerald-700" />
          ) : (
            <Button size="sm" onClick={handleGiveConsent}>
              منح الموافقة
            </Button>
          )}
        </div>
      </Card>

      {/* My Recordings */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-stone-900 mb-3">تسجيلاتي</h3>
        {recordings.length === 0 ? (
          <EmptyState
            icon={<Mic className="w-10 h-10" />}
            title="لا توجد تسجيلات"
            description="سجّل تلاوتك الأولى من صفحة الحديث"
          />
        ) : (
          <div className="space-y-2">
            {recordings.map((rec) => (
              <Card key={rec.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/hadiths/${rec.hadith_id}`}
                      className="text-sm font-medium text-emerald-700 hover:underline line-clamp-1"
                    >
                      {rec.hadith_excerpt || 'حديث'}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-stone-500 mt-1">
                      <span>❤️ {rec.likes_count}</span>
                      <span>🎧 {rec.listens_count}</span>
                      <span dir="ltr">{rec.duration_seconds}ث</span>
                      {rec.is_verified && <Badge variant="verified">معتمد</Badge>}
                    </div>
                    <p className="text-xs text-stone-400 mt-1">{formatDate(rec.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/hadiths/${rec.hadith_id}`}
                      className="p-2 rounded-full hover:bg-stone-100 text-stone-500"
                      aria-label="تشغيل"
                    >
                      <Play className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteRecording(rec.id)}
                      className="p-2 rounded-full hover:bg-red-50 text-red-500"
                      aria-label="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Sign Out */}
      <Button variant="secondary" className="w-full" onClick={handleSignOut}>
        <LogOut className="w-4 h-4" />
        تسجيل الخروج
      </Button>
    </PageContainer>
  )
}
