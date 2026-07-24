'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface Crumb {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: Crumb[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-stone-500 mb-4 overflow-x-auto" aria-label="مسار التنقل">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronLeft className="w-4 h-4 text-stone-300 flex-shrink-0" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-emerald-700 transition-colors whitespace-nowrap">
              {item.label}
            </Link>
          ) : (
            <span className="text-stone-900 font-medium whitespace-nowrap">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
