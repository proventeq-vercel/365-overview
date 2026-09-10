import { test, expect } from '@playwright/test'

test.describe('Security & Oversharing sneak peek – mock mode', () => {
  test('renders the report heading', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Security & Oversharing Overview' }),
    ).toBeVisible()
  })

  test('has no section navigation', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('navigation', { name: 'Sections' })).toHaveCount(0)
  })
})
