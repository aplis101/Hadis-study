'use client'

import type { TakhrijReference } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { BookMarked } from 'lucide-react'

interface TakhrijListProps {
  open: boolean
  onClose: () => void
  references: TakhrijReference[]
}

export function TakhrijList({ open, onClose, references }: TakhrijListProps) {
  return (
    <Modal open={open} onClose={onClose} title="التخريج">
      {references.length === 0 ? (
        <p className="text-stone-500 text-sm py-4 text-center">لا توجد تخريجات متاحة</p>
      ) : (
        <div className="space-y-3 mt-2">
          {references.map((ref) => (
            <div
              key={ref.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-stone-50 border border-stone-200"
            >
              <BookMarked className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-900 text-sm">{ref.source_book}</p>
                <p className="text-xs text-stone-500 mt-0.5" dir="ltr">
                  {ref.reference_number}
                </p>
              </div>
              {ref.grade && (
                <Badge variant={ref.grade === 'sahih' ? 'sahih' : ref.grade === 'hasan' ? 'hasan' : 'daif'}>
                  {ref.grade === 'sahih' ? 'صحيح' : ref.grade === 'hasan' ? 'حسن' : ref.grade === 'daif' ? 'ضعيف' : ref.grade}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
