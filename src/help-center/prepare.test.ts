import { describe, expect, it } from 'vitest'
import { fillVariables, outline, plainText, prepareBody, selectBlocks, variablesUsed } from './prepare'

const BODY = [
  'Shared.',
  '::: audience delegated',
  'Delegated only.',
  '::: if consentUrl',
  'Consent at {{consentUrl}}.',
  ':::',
  ':::',
  '::: audience application',
  'Application only.',
  ':::',
  '::: unless consentUrl',
  'Ask for the link.',
  ':::',
].join('\n')

describe('selectBlocks', () => {
  it('keeps only the audience asked for', () => {
    const delegated = selectBlocks(BODY, { audience: 'delegated', variables: {} })
    expect(delegated).toContain('Delegated only.')
    expect(delegated).not.toContain('Application only.')
    const application = selectBlocks(BODY, { audience: 'application', variables: {} })
    expect(application).toContain('Application only.')
    expect(application).not.toContain('Delegated only.')
  })

  it('shows if-blocks only when the variable has a value, and unless-blocks otherwise', () => {
    const withLink = selectBlocks(BODY, { audience: 'delegated', variables: { consentUrl: 'https://x' } })
    expect(withLink).toContain('Consent at')
    expect(withLink).not.toContain('Ask for the link.')
    const withoutLink = selectBlocks(BODY, { audience: 'delegated', variables: { consentUrl: '' } })
    expect(withoutLink).not.toContain('Consent at')
    expect(withoutLink).toContain('Ask for the link.')
  })

  it('hides a nested block whose parent is hidden', () => {
    const application = selectBlocks(BODY, { audience: 'application', variables: { consentUrl: 'https://x' } })
    expect(application).not.toContain('Consent at')
  })

  it('leaves block markers inside code fences alone', () => {
    const fenced = '```\n::: audience delegated\n```'
    expect(selectBlocks(fenced, { audience: 'application', variables: {} })).toBe(fenced)
  })

  it('refuses a block that is never closed', () => {
    expect(() => selectBlocks('::: if x\nopen', { audience: 'a', variables: {} })).toThrow('never closed')
  })
})

describe('variables', () => {
  it('fills known variables and blanks missing ones', () => {
    expect(fillVariables('Id {{clientId}}, link {{ consentUrl }}.', { clientId: 'abc' })).toBe('Id abc, link .')
  })

  it('lists each variable a body uses once', () => {
    expect(variablesUsed('{{a}} {{b}} {{a}}')).toEqual(['a', 'b'])
  })

  it('prepares a body by selecting blocks and then filling variables', () => {
    expect(
      prepareBody(BODY, { audience: 'delegated', variables: { consentUrl: 'https://consent' } }),
    ).toContain('Consent at https://consent.')
  })
})

describe('outline', () => {
  it('lists second and third level headings with GitHub-style ids, de-duplicated', () => {
    const body = '# Title\n## Cost of doing nothing, next 12 months\n### `Code` and **bold**\n## Steps\n## Steps\n```\n## Not a heading\n```'
    expect(outline(body)).toEqual([
      { id: 'cost-of-doing-nothing-next-12-months', text: 'Cost of doing nothing, next 12 months', depth: 2 },
      { id: 'code-and-bold', text: 'Code and bold', depth: 3 },
      { id: 'steps', text: 'Steps', depth: 2 },
      { id: 'steps-1', text: 'Steps', depth: 2 },
    ])
  })
})

describe('plainText', () => {
  it('strips markdown syntax, link targets and table rules', () => {
    expect(plainText('## Head\n- **Bold** [link](x.md)\n| a | b |\n| --- | --- |')).toBe('Head Bold link a   b')
  })
})
