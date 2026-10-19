import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Контраст текста по ГОСТ Р 52872-2019 (≈ WCAG 2.1 AA): обычный текст — не ниже 4,5:1.
// Vitest подменяет импорт CSS пустой строкой, поэтому читаем файл напрямую.
const css = readFileSync(resolve(process.cwd(), 'src/assets/main.css'), 'utf-8')
const tokens = Object.fromEntries(
  [...css.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]),
)

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(fg: string, bg: string) {
  const [a, b] = [luminance(tokens[fg]!), luminance(tokens[bg]!)].sort((x, y) => y - x)
  return (a! + 0.05) / (b! + 0.05)
}

const LIGHT = ['page', 'card', 'field', 'mute', 'accent-soft', 'lilac']

describe('контраст цветов темы', () => {
  it.each(LIGHT)('основной и вторичный текст читаются на фоне %s', (bg) => {
    expect(contrast('ink', bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrast('ink-2', bg)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['accent', 'orange'])('на насыщенном фоне %s читается тёмно-синий', (bg) => {
    expect(contrast('accent-ink', bg)).toBeGreaterThanOrEqual(4.5)
  })

  it('на сирени и оранжевом вторичный текст перекрашивается правилом', () => {
    expect(css).toMatch(
      /\.bg-accent \.text-ink-2,\s*\.bg-orange \.text-ink-2 \{\s*color: var\(--color-accent-ink\)/,
    )
  })
})
