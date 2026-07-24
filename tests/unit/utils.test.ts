import { test, expect } from '@playwright/test'

test.describe('formatDuration', () => {
  const { formatDuration } = require('@/lib/utils')

  test('0 ثانية → 0:00', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  test('24 ثانية → 0:24', () => {
    expect(formatDuration(24)).toBe('0:24')
  })

  test('90 ثانية → 1:30', () => {
    expect(formatDuration(90)).toBe('1:30')
  })

  test('180 ثانية → 3:00', () => {
    expect(formatDuration(180)).toBe('3:00')
  })

  test('3661 ثانية → 61:01', () => {
    expect(formatDuration(3661)).toBe('61:01')
  })
})

test.describe('truncateText', () => {
  const { truncateText } = require('@/lib/utils')

  test('نص قصير لا يُقتطع', () => {
    expect(truncateText('السلام عليكم', 50)).toBe('السلام عليكم')
  })

  test('نص طويل يُقتطع مع علامة حذف', () => {
    const result = truncateText('إنما الأعمال بالنيات وإنما لكل امرئ ما نوى', 20)
    expect(result.length).toBeLessThanOrEqual(23)
    expect(result).toContain('…')
  })

  test('نص فارغ يعيد فارغاً', () => {
    expect(truncateText('', 10)).toBe('')
  })

  test('الطول صفر يعيد فارغاً', () => {
    expect(truncateText('نص', 0)).toBe('')
  })
})

test.describe('getGradeColor', () => {
  const { getGradeColor } = require('@/lib/utils')

  test('sahih → لون أخضر', () => {
    expect(getGradeColor('sahih')).toContain('green')
  })

  test('hasan → لون أصفر', () => {
    expect(getGradeColor('hasan')).toContain('yellow')
  })

  test('daif → لون أحمر', () => {
    expect(getGradeColor('daif')).toContain('red')
  })
})
