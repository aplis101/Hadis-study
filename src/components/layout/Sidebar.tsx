'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Flag, AlertTriangle, Settings } from 'lucide-react'

const links = [
  { href: '/admin', label: 'لوحة الملخص', icon: LayoutDashboard },
  { href: '/admin/reports', label: 'بلاغات الصوت', icon: Flag },
  { href: '/admin/content-reports', label: 'بلاغات المحتوى', icon: AlertTriangle },
  { href: '/admin/settings', label: 'الإعدادات', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-white border-s border-stone-200 p-4 flex-shrink-0 hidden lg:flex flex-col gap-1">
      <h2 className="text-sm font-bold text-stone-400 mb-3 px-3">لوحة المشرف</h2>
      {links.map(link => {
        const Icon = link.icon
        const isActive = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {link.label}
          </Link>
        )
      })}
    </aside>
  )
}
