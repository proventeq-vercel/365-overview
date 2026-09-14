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

test('the header keeps the options button and the tenant next to the menu button', async ({ page }) => {
  await page.goto('/')
  const banner = page.getByRole('banner')
  await expect(banner).toContainText('Contoso Ltd')
  await expect(banner.getByRole('button', { name: 'Open menu' })).toBeVisible()
  await expect(banner.getByRole('button', { name: 'Options' })).toBeVisible()
  await banner.getByRole('button', { name: 'Options' }).click()
  const menu = page.getByRole('menu', { name: 'Options' })
  await expect(menu.getByRole('menuitem')).toHaveText([/Refresh data/, /Report settings/])
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

test('an unknown path goes home, where the first enabled report lives', async ({ page }) => {
  await page.goto('/nowhere')
  await expect(page.getByRole('heading', { name: 'Storage Optimisation', level: 1 })).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('link', { name: 'Storage Optimisation' })).toHaveAttribute('aria-current', 'page')
})

test('VITE_MODES_LOCKED keeps the URL from changing the modes', async ({ page }) => {
  await page.goto('/?features=optimization.storage.report.overview&scenario=concealed')
  await expect(page.getByRole('heading', { name: /main offenders/i })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()
  await expect(page.getByText(/appear as hashes/i)).toHaveCount(0)
})

test('the options menu opens the settings dialog by keyboard and hands focus back on Escape', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /main offenders/i })).toBeVisible()
  const options = page.getByRole('button', { name: 'Options' })
  await options.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('menu', { name: 'Options' })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: /refresh data/i })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitem', { name: /report settings/i })).toBeFocused()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Report settings' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('combobox', { name: 'Currency' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(options).toBeFocused()
})

test('the OneDrive table pages through the drives fifty at a time', async ({ page }) => {
  await page.goto('/onedrive-usage')
  await expect(page.getByRole('heading', { name: 'OneDrive Usage', level: 1 })).toBeVisible()
  const table = page.getByRole('table', { name: 'OneDrives' })
  const rows = table.getByRole('row').filter({ has: page.getByRole('cell') })
  await expect(rows).toHaveCount(50)
  await expect(page.getByText('1–50 of 400')).toBeVisible()
  await page.getByRole('button', { name: 'Last page' }).click()
  await expect(page.getByText('351–400 of 400')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled()
})
