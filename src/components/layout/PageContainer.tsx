'use client'

import type { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  className?: string
  maxWidth?: string
}

export function PageContainer({ children, className = '', maxWidth = 'max-w-3xl' }: PageContainerProps) {
  return (
    <main className={`flex-1 w-full mx-auto px-4 py-6 ${maxWidth} ${className}`}>
      {children}
    </main>
  )
}
