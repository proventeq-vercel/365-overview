import { test, expect } from '@playwright/test'

const FIXTURES = {
  exposedSites: '2,500',
  tenantName: 'Contoso Ltd',
  refreshDate: '2026-09-07',
}

test.describe('Security & Oversharing sneak peek – mock mode', () => {
  test('renders the report over the exposed fixture tenant', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Security & Oversharing Overview' })).toBeVisible()
    await expect(page.getByText(FIXTURES.tenantName)).toBeVisible()
    await expect(page.getByText(`Reports as of ${FIXTURES.refreshDate}`)).toBeVisible()
    await expect(page.getByRole('main')).toContainText(`${FIXTURES.exposedSites} sites`)
  })

  test('shows every report section and no navigation', async ({ page }) => {
    await page.goto('/')
    for (const section of ['Broad Sharing', 'External Access', 'Sharing Posture', 'Sites']) {
      await expect(page.getByRole('region', { name: section })).toBeVisible()
    }
    await expect(page.getByRole('navigation', { name: 'Sections' })).toHaveCount(0)
  })

  test('labels the counts as links, never as files', async ({ page }) => {
    await page.goto('/')
    const anyoneCard = page.getByText('Public or Anyone Links').locator('xpath=ancestor::*[@data-slot="card"][1]')
    await expect(anyoneCard).toContainText('links, on')
    await expect(anyoneCard).not.toContainText('files')
    await expect(page.getByRole('main')).toContainText('count sharing links, not files')
  })

  test('names what the report cannot see', async ({ page }) => {
    await page.goto('/')
    const closing = page.getByRole('region', { name: 'What this report cannot see' })
    await expect(closing).toContainText('cannot see who holds Edit or Full Control')
    await expect(closing).toContainText('cannot fix any of it')
  })
})

test.describe('degraded tenants', () => {
  test('a Reports Reader sees links but an unavailable posture, never a zero', async ({ page }) => {
    await page.goto('/?tenant=reports-reader')
    await expect(page.getByRole('region', { name: 'Broad Sharing' })).toBeVisible()
    const posture = page.getByRole('region', { name: 'Sharing Posture' })
    await expect(posture).toContainText('Sharing posture — unavailable')
    await expect(posture).toContainText('SharePoint Administrator')
    await expect(posture).toContainText('this is not a zero')
  })

  test('a locked-down tenant reports no exposure rather than no data', async ({ page }) => {
    await page.goto('/?tenant=locked-down')
    const broad = page.getByRole('region', { name: 'Broad Sharing' })
    await expect(broad).toContainText('No Exposure Detected')
    await expect(page.getByRole('region', { name: 'Sharing Posture' })).toContainText('Off')
  })

  test('a concealed tenant explains the setting and keeps its totals', async ({ page }) => {
    await page.goto('/?tenant=concealed')
    await expect(page.getByRole('note')).toContainText('Display concealed user, group, and site names')
    await expect(page.getByRole('main')).toContainText('900 sites')
  })

  test('an unknown tenant key falls back to the default fixture', async ({ page }) => {
    await page.goto('/?tenant=not-a-tenant')
    await expect(page.getByRole('main')).toContainText('2,500 sites')
  })
})
