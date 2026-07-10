import { test, expect } from '@playwright/test'

/**
 * Fixture-derived constants used across assertions.
 * Source: src/data/fixtures.ts
 */
const FIXTURES = {
  /** sharePoint.totalSites = 4 sites */
  spTotalSites: '4',
  /** sharePoint.sites[0].siteUrl */
  spSiteUrl: 'https://contoso.sharepoint.com/sites/marketing',
  /** licenses[0].skuPartNumber */
  licenseSku: 'SPE_E5',
  /** org.displayName */
  orgName: 'Contoso Ltd',
  /** mailbox.totalMailboxes = 742 */
  totalMailboxes: '742',
  /** azureCost: currency='GBP', amount=12847.63 → round → 12848 → Intl: '12,848' */
  azureCostLabel: 'GBP',
  azureCostAmount: '12,848',
  /** resourceCounts[0] */
  azureResourceType: 'Microsoft.Compute/virtualMachines',
}

test.describe('M365 Dashboard – mock mode', () => {
  test('Overview page renders health tiles with fixture data', async ({ page }) => {
    await page.goto('/')
    // SharePoint tile links to the section and shows the fixture site count.
    // Scoped to <main> because the sidebar nav also has a "SharePoint" link,
    // which would otherwise collide under Playwright's strict-mode matching.
    const spTile = page.getByRole('main').getByRole('link', { name: /SharePoint/ })
    await expect(spTile).toBeVisible()
    await expect(page.getByText('4 sites')).toBeVisible()
  })

  test('SharePoint page shows site count and a site URL', async ({ page }) => {
    await page.goto('/')
    // Scope nav click to the sidebar nav (aria-label="Sections") to avoid the KPI card links
    await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'SharePoint' }).click()

    // KPI label 'Total sites' with value '4', scoped to its KPI card
    await expect(page.getByText('Total sites')).toBeVisible()
    const totalSitesCard = page.locator('.kpi-card').filter({ hasText: 'Total sites' })
    await expect(totalSitesCard.getByText(FIXTURES.spTotalSites, { exact: true })).toBeVisible()

    // One of the fixture site URLs rendered in the table
    await expect(page.getByText(FIXTURES.spSiteUrl)).toBeVisible()
  })

  test('Licensing page shows SKU part number and a consumption bar', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Licensing' }).click()

    // The SKU table should contain SPE_E5 in the data cell
    await expect(page.getByRole('cell', { name: FIXTURES.licenseSku })).toBeVisible()

    // At least one progressbar (ConsumptionBar component)
    await expect(page.getByRole('progressbar').first()).toBeVisible()
  })

  test('Estate page shows org display name from fixtures', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Estate' }).click()

    // org.displayName = 'Contoso Ltd'
    await expect(page.getByText(FIXTURES.orgName)).toBeVisible()
  })

  test('Exchange page shows total mailboxes KPI', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Exchange' }).click()

    await expect(page.getByText('Total mailboxes')).toBeVisible()
    // mailbox.totalMailboxes = 742 → formatNumber(742) = '742'
    await expect(page.getByText(FIXTURES.totalMailboxes, { exact: true })).toBeVisible()
  })

  test('Azure page shows GBP cost and a resource-type row', async ({ page }) => {
    await page.goto('/')
    // Scope nav click to sidebar nav to avoid the 'Azure spend (MTD)' card link
    await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Azure' }).click()

    // azureCost: 'GBP 12,848' (amount rounded then Intl-formatted)
    await expect(page.getByText(FIXTURES.azureCostLabel, { exact: false })).toBeVisible()
    await expect(page.getByText(FIXTURES.azureCostAmount, { exact: false })).toBeVisible()

    // Resource type from fixtures
    await expect(page.getByText(FIXTURES.azureResourceType)).toBeVisible()
  })
})
