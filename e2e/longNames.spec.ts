import { expect, test, type Locator } from '@playwright/test'

const LONGEST_SITE = 'Global Procurement and Vendor Management Programme Office – EMEA Regional Collaboration Workspace'
const LONGEST_OWNER = 'Maximiliana Featherstonehaugh-Montgomery-Abernathy'
const LONGEST_DRIVE = 'maximiliana_featherstonehaughmontgomeryabernathy_contoso_com'

async function rightEdges(name: Locator) {
  return name.evaluate((element) => {
    const box = element.closest('li, [role="cell"]')!
    const style = getComputedStyle(element)
    return {
      ellipsis: style.textOverflow === 'ellipsis' && style.whiteSpace === 'nowrap' && style.overflow === 'hidden',
      name: element.getBoundingClientRect().right,
      box: box.getBoundingClientRect().right,
      viewport: document.documentElement.clientWidth,
      list: element.closest('li') !== null,
    }
  })
}

for (const width of [1280, 390]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('the longest site, owner and OneDrive names stay inside their card and row', async ({ page }) => {
      await page.goto('/')
      const offenders = page.locator('section', { hasText: 'Main offenders' })
      await expect(offenders.getByRole('table')).toBeVisible({ timeout: 30_000 })

      const names = offenders
        .locator('li, [role="cell"]')
        .getByText(new RegExp(`^(${LONGEST_SITE}|${LONGEST_OWNER}|${LONGEST_DRIVE})$`))
      await expect(names.first()).toBeVisible()
      const count = await names.count()
      expect(count).toBeGreaterThanOrEqual(4)
      for (let index = 0; index < count; index++) {
        const edges = await rightEdges(names.nth(index))
        expect(edges.ellipsis).toBe(true)
        expect(edges.name).toBeLessThanOrEqual(edges.box + 0.5)
        if (edges.list) expect(edges.box).toBeLessThanOrEqual(edges.viewport)
      }
    })

    test('a name cut short shows in full on hover and on keyboard focus', async ({ page }) => {
      await page.goto('/')
      const topSites = page.getByRole('heading', { name: 'Top SharePoint sites by storage' }).locator('xpath=ancestor::*[.//ul][1]')
      const name = topSites.locator('li').getByText(LONGEST_SITE, { exact: true })
      await expect(name).toBeVisible({ timeout: 30_000 })
      expect(await name.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
      const tooltip = page.locator('[data-slot="tooltip-content"]')

      await name.hover()
      await expect(tooltip).toHaveText(LONGEST_SITE)
      await page.mouse.move(0, 0)
      await expect(tooltip).toHaveCount(0)

      await name.focus()
      await expect(tooltip).toHaveText(LONGEST_SITE)
    })

    test('the full name of an unbreakable OneDrive wraps inside its tooltip', async ({ page }) => {
      await page.goto('/')
      const offenders = page.locator('section', { hasText: 'Main offenders' })
      const name = offenders.getByRole('cell').getByText(LONGEST_DRIVE, { exact: true })
      await expect(name).toBeVisible({ timeout: 30_000 })
      expect(await name.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
      await name.hover()
      const tooltip = page.locator('[data-slot="tooltip-content"][data-open]')
      await expect(tooltip).toHaveText(LONGEST_DRIVE)
      await tooltip.evaluate((element) => Promise.allSettled(element.getAnimations().map((animation) => animation.finished)))
      const fit = await tooltip.evaluate((element) => ({
        scroll: element.scrollWidth,
        client: element.clientWidth,
        left: element.getBoundingClientRect().left,
        right: element.getBoundingClientRect().right,
        viewport: document.documentElement.clientWidth,
      }))
      expect(fit.scroll).toBeLessThanOrEqual(fit.client)
      expect(fit.left).toBeGreaterThanOrEqual(0)
      expect(fit.right).toBeLessThanOrEqual(fit.viewport)
    })
  })
}
