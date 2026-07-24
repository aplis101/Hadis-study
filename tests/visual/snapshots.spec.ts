import { test, expect } from '@playwright/test'

test.describe('الاختبارات البصرية (Visual Regression)', () => {
  test('الصفحة الرئيسية - قائمة المجموعات', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('home-collections.png', {
      maxDiffPixels: 100,
      threshold: 0.1,
    })
  })

  test('صفحة تسجيل الدخول', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixels: 100,
      threshold: 0.1,
    })
  })

  test('صفحة الحديث - العرض الكامل', async ({ page }) => {
    // يحتاج معرف حديث حقيقي
    // await page.goto('/hadiths/[test-hadith-id]')
    // await expect(page).toHaveScreenshot('hadith-page.png')
  })

  test('لوحة المشرف - لوحة الملخص', async ({ page }) => {
    // يحتاج حساب مشرف
    // await page.goto('/admin')
    // await expect(page).toHaveScreenshot('admin-dashboard.png')
  })

  test('اللوحة المنزلقة للتسجيلات', async ({ page }) => {
    // اختبار فتح اللوحة المنزلقة والتقاط صورة
  })
})
