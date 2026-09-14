import { test, expect, type Page } from '@playwright/test'

async function reportLoaded(page: Page) {
  await expect(page.getByRole('heading', { name: /main offenders/i })).toBeVisible()
}

test('renders the header with the tenant and all three report sections', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner')).toContainText('Contoso Ltd')
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { name: 'Storage Optimisation', level: 1 })).toBeVisible()
  await expect(main.getByRole('heading', { name: /current storage distribution/i })).toBeVisible()
  await expect(main.getByRole('heading', { name: /future state & growth impact/i })).toBeVisible()
  await expect(main.getByRole('heading', { name: /main offenders/i })).toBeVisible()
})

test('runs as a single report: no menu button, no breadcrumb, no footer, and the flagged-off report falls back', async ({ page }) => {
  await page.goto('/onedrive-usage')
  await reportLoaded(page)
  await expect(page.getByRole('heading', { name: 'Storage Optimisation', level: 1 })).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('button', { name: 'Open menu' })).toHaveCount(0)
  await expect(page.getByRole('banner').getByRole('navigation')).toHaveCount(0)
  await expect(page.getByRole('contentinfo')).toHaveCount(0)
})

test('the trend chart draws the entitlement line', async ({ page }) => {
  await page.goto('/')
  const chart = page.getByRole('img', { name: /storage trend/i })
  await expect(chart.getByText('Entitlement', { exact: true })).toBeVisible()
})

test('every chart has an accessible name', async ({ page }) => {
  await page.goto('/')
  await reportLoaded(page)
  const charts = await page.getByRole('img').all()
  expect(charts.length).toBeGreaterThan(0)
  for (const chart of charts) {
    await expect(chart).toHaveAccessibleName(/\S/)
  }
})

test.describe('the offenders table pages through a large estate', () => {
  const bodyRows = (page: Page) => page.getByRole('table', { name: 'Sites and drives' }).getByRole('row').filter({ has: page.getByRole('cell') })

  test('shows fifty rows a page with the range and disables the back buttons on page one', async ({ page }) => {
    await page.goto('/')
    await reportLoaded(page)
    await expect(bodyRows(page)).toHaveCount(50)
    await expect(page.getByText(/^1–50 of [\d,]+$/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'First page' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Next page' })).toBeEnabled()
  })

  test('next, last and first move through the pages', async ({ page }) => {
    await page.goto('/')
    await reportLoaded(page)
    const firstName = (await bodyRows(page).first().getByRole('cell').first().textContent()) ?? ''
    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(page.getByText(/^51–100 of [\d,]+$/)).toBeVisible()
    await expect(bodyRows(page).first().getByRole('cell').first()).not.toHaveText(firstName)
    await page.getByRole('button', { name: 'Last page' }).click()
    await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Last page' })).toBeDisabled()
    await page.getByRole('button', { name: 'First page' }).click()
    await expect(bodyRows(page).first().getByRole('cell').first()).toHaveText(firstName)
  })

  test('the page size can be raised and a search starts again from page one', async ({ page }) => {
    await page.goto('/')
    await reportLoaded(page)
    await page.getByRole('combobox', { name: 'Rows per page' }).click()
    await page.getByRole('option', { name: '100' }).click()
    await expect(bodyRows(page)).toHaveCount(100)
    await expect(page.getByText(/^1–100 of [\d,]+$/)).toBeVisible()
    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(page.getByText(/^101–200 of [\d,]+$/)).toBeVisible()
    await page.getByRole('searchbox', { name: 'Search Sites and drives' }).fill('team-1')
    await expect(page.getByText(/^1–100 of [\d,]+$/)).toBeVisible()
    await page.getByRole('searchbox', { name: 'Search Sites and drives' }).fill('no such site')
    await expect(page.getByText('No rows')).toBeVisible()
    await expect(bodyRows(page)).toHaveCount(0)
  })
})

async function chooseOption(page: Page, name: RegExp) {
  await page.getByRole('button', { name: 'Options' }).click()
  await page.getByRole('menuitem', { name }).click()
}

test('the report settings option re-prices the report in the chosen currency', async ({ page }) => {
  await page.goto('/')
  await reportLoaded(page)
  const costCard = page.locator('[data-slot="stat-card"]', { hasText: 'Cost of doing nothing' })
  await expect(costCard).toContainText('£')

  await chooseOption(page, /report settings/i)
  const dialog = page.getByRole('dialog', { name: 'Report settings' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/estimated from licences: 7\.8 TB/i)).toBeVisible()
  await dialog.getByRole('combobox', { name: 'Currency' }).click()
  await page.getByRole('option', { name: /EUR/ }).click()
  await expect(costCard).toContainText('€')

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await page.reload()
  await reportLoaded(page)
  await expect(costCard).toContainText('€')
})

test('an entitlement override replaces the licence estimate everywhere', async ({ page }) => {
  await page.goto('/')
  await reportLoaded(page)
  await expect(page.getByText(/estimated from licence counts/i).first()).toBeVisible()

  await chooseOption(page, /report settings/i)
  await page.getByLabel('SharePoint entitlement').fill('40')
  await expect(page.getByText(/estimated from licence counts/i)).toHaveCount(0)
  await expect(page.locator('[data-slot="stat-card"]', { hasText: 'Storage used' })).toContainText(
    'of 40 TB entitlement',
  )
})

test('refresh re-runs the report without a blank flash', async ({ page }) => {
  await page.goto('/')
  await reportLoaded(page)
  await chooseOption(page, /refresh data/i)
  await expect(page.getByRole('heading', { name: /main offenders/i })).toBeVisible()
  await page.getByRole('button', { name: 'Options' }).click()
  await expect(page.getByRole('menuitem', { name: /refresh data/i })).not.toHaveAttribute('aria-disabled')
  await page.keyboard.press('Escape')
})

test('every button, link and menu item shows a pointer cursor', async ({ page }) => {
  await page.goto('/')
  await reportLoaded(page)
  await page.getByRole('button', { name: 'Options' }).click()
  await expect(page.getByRole('menu', { name: 'Options' })).toBeVisible()
  const cursors = await page.evaluate(() =>
    [...document.querySelectorAll('button:not(:disabled), a[href], [role="combobox"], [role="menuitem"]')].map((el) => ({
      label: el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '',
      cursor: getComputedStyle(el).cursor,
    })),
  )
  expect(cursors.length).toBeGreaterThan(3)
  expect(cursors.filter((c) => c.cursor !== 'pointer')).toEqual([])
})

test.describe('before any script runs', () => {
  test.use({ javaScriptEnabled: false })

  test('the HTML shell already shows the branded loading card', async ({ page }) => {
    await page.goto('/')
    const status = page.getByRole('status')
    await expect(status).toContainText('Loading…')
    await expect(status.locator('.auth-screen__spinner')).toBeVisible()
    const logo = await status.locator('.auth-screen__card').evaluate((card) => {
      const before = getComputedStyle(card, '::before')
      return { mask: before.maskImage || before.webkitMaskImage, width: before.width }
    })
    expect(logo.mask).toContain('proventeq-logo.svg')
    expect(logo.width).not.toBe('0px')
  })
})

test.describe('modes from the URL', () => {
  const BOTH = 'optimization.storage.report.overview,optimization.storage.report.onedrive'

  test('?features= enables reports for the tab, ?modes=reset forgets them', async ({ page }) => {
    await page.goto(`/?features=${BOTH}`)
    await reportLoaded(page)
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()

    await page.goto('/onedrive-usage')
    await expect(page.getByRole('heading', { name: 'OneDrive Usage', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()

    await page.goto('/?modes=reset')
    await reportLoaded(page)
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden()
  })

  test('?scenario= switches the fixture tenant for the tab', async ({ page }) => {
    await page.goto('/?scenario=concealed')
    await reportLoaded(page)
    await expect(page.getByText(/appear as hashes/i)).toBeVisible()
    await page.goto('/?scenario=')
    await reportLoaded(page)
    await expect(page.getByText(/appear as hashes/i)).toHaveCount(0)
  })

  test('?mock=false on a mock-only build cannot start, and the reset link brings the tab back', async ({ page }) => {
    await page.goto('/?mock=false')
    const alert = page.getByRole('alert')
    await expect(alert).toContainText("Couldn't start the dashboard")
    await expect(alert).toContainText(/this tab overrides the deployed modes/i)
    await page.goto('/')
    await expect(page.getByRole('alert')).toContainText("Couldn't start the dashboard")
    await page.getByRole('link', { name: 'Reset the modes for this tab' }).click()
    await reportLoaded(page)
    await page.goto('/')
    await reportLoaded(page)
  })

  test('a new tab starts from the env again', async ({ browser }) => {
    const first = await browser.newContext()
    const page = await first.newPage()
    await page.goto(`/?features=${BOTH}`)
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()
    await first.close()

    const second = await browser.newContext()
    const fresh = await second.newPage()
    await fresh.goto('/')
    await reportLoaded(fresh)
    await expect(fresh.getByRole('button', { name: 'Open menu' })).toBeHidden()
    await second.close()
  })
})
