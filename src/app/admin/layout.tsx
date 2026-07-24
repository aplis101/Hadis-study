'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/layout/Sidebar'
import { Skeleton } from '@/components/ui/Skeleton'
import Link from 'next/link'
import { LayoutDashboard, Flag, AlertTriangle, Settings } from 'lucide-react'

const mobileLinks = [
  { href: '/admin', label: 'الملخص', icon: LayoutDashboard },
  { href: '/admin/reports', label: 'بلاغات الصوت', icon: Flag },
  { href: '/admin/content-reports', label: 'بلاغات المحتوى', icon: AlertTriangle },
  { href: '/admin/settings', label: 'الإعدادات', icon: Settings },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/')
        return
      }

      setIsAdmin(true)
      setChecking(false)
    }
    check()
  }, [supabase, router])

  if (checking) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="flex-1 flex">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile tabs */}
        <div className="lg:hidden flex border-b border-stone-200 overflow-x-auto bg-white sticky top-14 z-30">
          {mobileLinks.map(link => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-emerald-700 text-emerald-700'
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            )
          })}
        </div>

        {children}
      </div>
    </div>
  )
}
