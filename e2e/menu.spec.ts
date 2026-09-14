import { test, expect } from '@playwright/test'

test('the floating menu lists the registered reports and marks the current one', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /main offenders/i })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Reports' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Open menu' }).click()
  const menu = page.getByRole('dialog', { name: 'Reports' })
  await expect(menu).toBeVisible()
  const links = menu.getByRole('link')
  await expect(links).toHaveText(['Storage Optimisation', 'OneDrive Usage'])
  await expect(links.first()).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('button', { name: 'Close menu' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
})

test('a menu link routes to the report path and closes the menu', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('link', { name: 'Storage Optimisation' }).click()
  await expect(page).toHaveURL(/\/storage-optimisation$/)
  await expect(page.getByRole('dialog', { name: 'Reports' })).toBeHidden()
  await expect(page.getByRole('heading', { name: /main offenders/i })).toBeVisible()
})

test('the header keeps refresh, settings and the tenant next to the menu button', async ({ page }) => {
  await page.goto('/')
  const banner = page.getByRole('banner')
  await expect(banner).toContainText('Contoso Ltd')
  await expect(banner.getByRole('button', { name: 'Open menu' })).toBeVisible()
  await expect(banner.getByRole('button', { name: 'Refresh' })).toBeVisible()
  await expect(banner.getByRole('button', { name: 'Settings' })).toBeVisible()
})

test('the OneDrive report is reachable from the menu and renders its own cards and table', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('link', { name: 'OneDrive Usage' }).click()
  await expect(page).toHaveURL(/\/onedrive-usage$/)
  await expect(page.getByRole('heading', { name: 'OneDrive Usage', level: 1 })).toBeVisible()
  await expect(page.locator('[data-slot="stat-card"]')).toHaveCount(4)
  await expect(page.getByRole('table', { name: 'OneDrives' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Drive' })).toBeVisible()
  await expect(page.getByRole('banner')).toContainText('Contoso Ltd')

  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('link', { name: 'OneDrive Usage' })).toHaveAttribute('aria-current', 'page')
})

test('an unknown path falls back to the first enabled report', async ({ page }) => {
  await page.goto('/nowhere')
  await expect(page.getByRole('heading', { name: 'Storage Optimisation', level: 1 })).toBeVisible()
})
