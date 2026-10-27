import { test, expect } from '@playwright/test'

const NOTHING_SHOWN = /unavailable|unknown|not enough history|could not be read|not an all-clear/i

const ONEDRIVE = 'optimization.storage.report.overview,optimization.storage.report.onedrive'

const SCENARIOS = [
  'healthy',
  'short-history',
  'no-licences',
  'first-day',
  'nothing-to-clean',
  'over-entitlement',
  'concealed',
  'onedrive-over-licence',
  'no-daily-reports',
  'onedrive-gaps',
]

for (const scenario of SCENARIOS) {
  test(`the ${scenario} tenant's storage report never says a figure is missing`, async ({ page }) => {
    await page.goto(`/?scenario=${scenario}`)
    await expect(page.getByRole('heading', { name: /main offenders/i })).toBeVisible()
    await expect(page.getByLabel('Loading the fastest-growing sites and OneDrives')).toHaveCount(0)
    expect(await page.getByRole('main').innerText()).not.toMatch(NOTHING_SHOWN)
  })

  test(`the ${scenario} tenant's OneDrive report never says a figure is missing`, async ({ page }) => {
    await page.goto(`/onedrive-usage?features=${ONEDRIVE}&scenario=${scenario}`)
    await expect(page.getByRole('heading', { name: 'OneDrive Usage', level: 1 })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('heading', { name: /inactive, deleted and unlicensed onedrives/i })).toBeVisible()
    expect(await page.getByRole('main').innerText()).not.toMatch(NOTHING_SHOWN)
  })
}

test('without licences the OneDrive report measures against the limit most OneDrives report', async ({ page }) => {
  await page.goto(`/onedrive-usage?features=${ONEDRIVE}&scenario=no-licences`)
  await expect(page.locator('[data-slot="stat-card"]', { hasText: 'Over the usual OneDrive limit' })).toHaveText(
    /^0Over the usual OneDrive limitEvery drive fits within 1 TB, the limit most OneDrives report$/,
  )
  await expect(page.getByText('No OneDrive holds more than 1 TB')).toBeVisible()
})

test('without the active-user report the quiet OneDrives stand in for the unlicensed ones, and the pool is drawn over the drives with a limit', async ({ page }) => {
  await page.goto(`/onedrive-usage?features=${ONEDRIVE}&scenario=onedrive-gaps`)
  await expect(page.locator('[data-slot="stat-card"]', { hasText: 'No activity for 93 days' })).toContainText(
    /live OneDrives have had no activity since 2026-05-29/,
  )
  await page.goto('/?scenario=onedrive-gaps')
  await expect(page.getByText(/^of the .+ allocated to the 388 OneDrives that report a limit used/)).toBeVisible()
  await expect(page.getByText(/^10 live OneDrives holding .+ report no limit and are left out of this line\.$/)).toBeVisible()
})

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

test('when no daily report comes back the growth panel charts the sites and OneDrives by storage used', async ({ page }) => {
  await page.goto('/?scenario=no-daily-reports')
  const chart = page.getByRole('img', { name: 'Sites & OneDrives by storage used' })
  await expect(chart.locator('.recharts-bar-rectangle')).toHaveCount(10)
  await expect(page.getByText(/^Ranked by storage used on \d{4}-\d{2}-\d{2}\. Growth is measured from Microsoft's daily usage reports, and none of those from \d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2} came back/)).toBeVisible()
})
