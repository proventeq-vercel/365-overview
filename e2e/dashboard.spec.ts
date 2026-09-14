import { test, expect } from '@playwright/test'

test('renders all three report sections', async ({ page }) => {
  await page.goto('/')
  const main = page.getByRole('main')
  await expect(
    main.getByRole('heading', { name: /current storage distribution/i }),
  ).toBeVisible()
  await expect(
    main.getByRole('heading', { name: /future state & growth impact/i }),
  ).toBeVisible()
  await expect(main.getByRole('heading', { name: /main offenders/i })).toBeVisible()
})

test('the trend chart draws the entitlement line', async ({ page }) => {
  await page.goto('/')
  const chart = page.getByRole('img', { name: /storage trend/i })
  await expect(chart.getByText('Entitlement', { exact: true })).toBeVisible()
})

test('every chart has an accessible name', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /main offenders/i })).toBeVisible()
  const charts = await page.getByRole('img').all()
  expect(charts.length).toBeGreaterThan(0)
  for (const chart of charts) {
    await expect(chart).toHaveAccessibleName(/\S/)
  }
})

test('the site table stays windowed on a large estate', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /main offenders/i })).toBeVisible()
  const rows = page.getByRole('row')
  await expect(rows.first()).toBeVisible()
  expect(await rows.count()).toBeLessThan(100)
})

test('the product view renders the same report inside the product shell', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Product view' }).click()
  await expect(page).toHaveURL(/\/product$/)
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText(
    'Storage Optimisation',
  )
  await expect(page.getByRole('heading', { name: /main offenders/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Top OneDrives by storage' })).toBeVisible()
  const charts = await page.getByRole('img').all()
  for (const chart of charts) {
    await expect(chart).toHaveAccessibleName(/\S/)
  }
  await page.getByRole('link', { name: 'Sneak peek' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('row').first()).toBeVisible()
})
