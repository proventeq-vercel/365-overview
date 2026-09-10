import { test, expect } from '@playwright/test'

test('renders the storage optimisation report', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Storage optimisation' }),
  ).toBeVisible()
})
