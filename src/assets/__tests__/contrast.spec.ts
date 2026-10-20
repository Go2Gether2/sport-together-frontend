import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Контраст текста по ГОСТ Р 52872-2019 (≈ WCAG 2.1 AA): обычный текст — не ниже 4,5:1.
// Vitest подменяет импорт CSS пустой строкой, поэтому читаем файл напрямую.
const css = readFileSync(resolve(process.cwd(), 'src/assets/main.css'), 'utf-8')

function tokensOf(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]),
  )
}

const light = tokensOf(css.match(/@theme \{[^}]*\}/)![0])
const dark = tokensOf(css.match(/:root\[data-theme='dark'\] \{[^}]*\}/)![0])

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(tokens: Record<string, string>, fg: string, bg: string) {
  const [a, b] = [luminance(tokens[fg]!), luminance(tokens[bg]!)].sort((x, y) => y - x)
  return (a! + 0.05) / (b! + 0.05)
}

const LIGHT = ['page', 'card', 'field', 'mute', 'accent-soft', 'lilac']

describe('контраст цветов светлой темы', () => {
  it.each(LIGHT)('основной и вторичный текст читаются на фоне %s', (bg) => {
    expect(contrast(light, 'ink', bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(light, 'ink-2', bg)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['accent', 'orange'])('на насыщенном фоне %s читается тёмно-синий', (bg) => {
    expect(contrast(light, 'accent-ink', bg)).toBeGreaterThanOrEqual(4.5)
  })

  it('на сирени и оранжевом вторичный текст перекрашивается правилом', () => {
    // Правило общее для обеих тем, ниже проверено и для тёмной.
    expect(css).toMatch(
      /\.bg-accent \.text-ink-2,\s*\.bg-orange \.text-ink-2 \{\s*color: var\(--color-accent-ink\)/,
    )
  })
})

describe('контраст цветов тёмной темы', () => {
  it('в тёмном блоке переопределены все цвета светлой', () => {
    expect(Object.keys(dark)).toEqual(expect.arrayContaining(Object.keys(light)))
  })

  it.each(LIGHT)('основной и вторичный текст читаются на фоне %s', (bg) => {
    expect(contrast(dark, 'ink', bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(dark, 'ink-2', bg)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['accent', 'orange'])('на фоне %s читаются основной текст и accent-ink', (bg) => {
    expect(contrast(dark, 'ink', bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(dark, 'accent-ink', bg)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['card', 'orange'])('ошибки orange-ink читаются на фоне %s', (bg) => {
    expect(contrast(dark, 'orange-ink', bg)).toBeGreaterThanOrEqual(4.5)
  })

  it('текст на кнопках bg-ink читается', () => {
    expect(contrast(dark, 'white', 'ink')).toBeGreaterThanOrEqual(4.5)
  })

  it('блок для системной тёмной темы совпадает с явным выбором', () => {
    const system = css.match(/:root:not\(\[data-theme='light'\]\) \{[^}]*\}/)![0]
    expect(tokensOf(system)).toEqual(dark)
  })
})
