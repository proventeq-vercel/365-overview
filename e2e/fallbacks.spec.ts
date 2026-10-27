import { test, expect } from '@playwright/test'

const NOTHING_SHOWN = /unavailable|unknown|not enough history|could not be read|not an all-clear/i

for (const scenario of ['healthy', 'short-history', 'no-licences', 'first-day', 'nothing-to-clean', 'over-entitlement', 'concealed', 'onedrive-over-licence']) {
  test(`the ${scenario} tenant's storage report never says a figure is missing`, async ({ page }) => {
    await page.goto(`/?scenario=${scenario}`)
    await expect(page.getByRole('heading', { name: /main offenders/i })).toBeVisible()
    await expect(page.getByLabel('Loading the fastest-growing sites and OneDrives')).toHaveCount(0)
    expect(await page.getByRole('main').innerText()).not.toMatch(NOTHING_SHOWN)
  })
}

test('a short history is forecast from its daily storage, and says over how many days', async ({ page }) => {
  await page.goto('/?scenario=short-history')
  const forecast = page.locator('[data-slot="stat-card"]', { hasText: 'Forecast exhaustion' })
  await expect(forecast).toContainText('Forecast from the last 31 days of storage')
  await expect(page.getByRole('main').getByText('Added last 31 days')).toBeVisible()
})

test('without licences the forecast card shows the monthly growth and the callout projects used storage', async ({ page }) => {
  await page.goto('/?scenario=no-licences')
  await expect(page.locator('[data-slot="stat-card"]', { hasText: 'SharePoint growth per month' })).toContainText('+')
  await expect(page.getByText(/^SharePoint storage reaches .+ in 6 months$/)).toBeVisible()
  await expect(page.getByRole('list', { name: 'Storage usage' }).getByText('Free')).toHaveCount(0)
})

test('from a single reported day the trend chart still draws that day', async ({ page }) => {
  await page.goto('/?scenario=first-day')
  const chart = page.getByRole('img', { name: /storage trend/i })
  await expect(chart.locator('.recharts-line-dot, .recharts-dot')).toHaveCount(1)
  await expect(page.locator('[data-slot="stat-card"]', { hasText: 'SharePoint storage used' })).toBeVisible()
  await expect(page.locator('[data-slot="stat-card"]', { hasText: 'Cost of doing nothing' })).toHaveCount(0)
})
