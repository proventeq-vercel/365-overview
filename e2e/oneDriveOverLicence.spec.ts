import { expect, test } from '@playwright/test'

const ONEDRIVE = 'optimization.storage.report.overview,optimization.storage.report.onedrive'

test('the OneDrive report lists the accounts over their licensed storage, and the setting moves the line', async ({
  page,
}) => {
  await page.goto(`/onedrive-usage?features=${ONEDRIVE}&scenario=onedrive-over-licence`)
  await expect(page.getByRole('heading', { name: 'OneDrive Usage', level: 1 })).toBeVisible({ timeout: 30_000 })

  const card = page.locator('[data-slot="stat-card"]', { hasText: 'Over licensed storage' })
  await expect(card).toHaveText(/^4Over licensed storage1\.1 TB beyond 5 TB per user$/)

  const table = page.getByRole('table', { name: 'OneDrives over licensed storage' })
  const rows = table.getByRole('row').filter({ has: page.getByRole('cell') })
  await expect(rows).toHaveCount(4)
  await expect(rows.first()).toContainText('User 350')
  await expect(rows.first()).toContainText('430 GB')

  await page.getByRole('button', { name: 'Options' }).click()
  await page.getByRole('menuitem', { name: /report settings/i }).click()
  await page.getByLabel('OneDrive storage per user').fill('6144')
  await page.keyboard.press('Escape')

  await expect(card).toHaveText(/^0Over licensed storageEvery drive fits within 6 TB per user$/)
  await expect(table).toHaveCount(0)
  await expect(page.getByText('No OneDrive holds more than 6 TB')).toBeVisible()
})

test('the storage report counts the drives over their licence beside the drives near cap', async ({ page }) => {
  await page.goto('/?scenario=onedrive-over-licence')
  await expect(page.getByRole('heading', { name: /main offenders/i })).toBeVisible({ timeout: 30_000 })
  await expect(
    page.getByText('Drives over licence', { exact: true }).locator('xpath=following-sibling::dd'),
  ).toHaveText('4')
})
