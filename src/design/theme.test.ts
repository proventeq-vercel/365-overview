import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LABEL_TONES, P365, P365_TEXT, textShade } from './theme'

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

const PAGE_BACKGROUNDS = ['#ffffff', '#f0f0f0', '#f9fafb', '#f3f4f6', '#e1f1f1', '#fef2ee']

describe('text shades', () => {
  it.each(Object.entries(P365_TEXT))('%s reads at 4.5:1 or more on every page background', (_, shade) => {
    for (const background of PAGE_BACKGROUNDS) expect(contrast(shade, background)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['red', 'green'] as const)('the %s pill text reads at 4.5:1 or more on its own background', (tone) => {
    expect(contrast(LABEL_TONES[tone].text, LABEL_TONES[tone].background)).toBeGreaterThanOrEqual(4.5)
  })

  it('maps each brand colour to its text shade and leaves dark colours as they are', () => {
    expect(textShade(P365.orange)).toBe('#c03a07')
    expect(textShade(P365.green)).toBe('#50730e')
    expect(textShade(P365.yellow)).toBe('#83650b')
    expect(textShade(P365.red)).toBe('#c70606')
    expect(textShade(P365.teal)).toBe('#267574')
    expect(textShade(P365.grey400)).toBe('#6a6a6a')
    expect(textShade(P365.grey100)).toBe('#6a6a6a')
    expect(textShade(P365.navy)).toBe('#0f2c3d')
  })

  it('mirrors every text shade as a --color-p365-*-text token', () => {
    const css = readFileSync(join(__dirname, '../index.css'), 'utf8')
    for (const [name, shade] of Object.entries(P365_TEXT)) {
      expect(css).toContain(`--color-p365-${name}-text: ${shade};`)
    }
  })

  it('writes the auth screen links in the teal text shade', () => {
    const css = readFileSync(join(__dirname, '../index.css'), 'utf8')
    expect(css).toContain('.error-state a { color:#267574;')
  })
})
