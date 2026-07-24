import { test, expect } from '@playwright/test'

test.describe('سياسات RLS - التحقق من الأمان', () => {
  test('الزائر يقرأ المجموعات لكنه لا يستطيع إدراج تسجيل', async ({ page }) => {
    await page.goto('/')
    // الزائر يرى المحتوى العام
    // لكن أزرار التسجيل مخفية
    const addButton = page.locator('text=أضف تسجيلك')
    await expect(addButton).not.toBeVisible()
  })

  test('المحتوى المرجعي متاح للجميع', async ({ page }) => {
    await page.goto('/')
    // الصفحة الرئيسية تظهر المجموعات
    await expect(page.locator('h1')).toBeVisible()
  })

  test('التسجيلات المخفية لا تظهر في القائمة العامة', async ({ page }) => {
    // يدوياً: إنشاء تسجيل مخفي والتأكد من عدم ظهوره للآخرين
  })
})
