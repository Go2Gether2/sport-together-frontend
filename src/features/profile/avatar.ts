import type { SportIconName } from '@/components/illustrations/SportIcon.vue'

// Загрузки файлов в API нет: в avatar_url пишем выбранный рисунок из нашего набора как «preset:<id>».
const PREFIX = 'preset:'

export interface AvatarPreset {
  id: SportIconName
  label: string
  bg: string
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'running', label: 'Бег', bg: 'bg-orange' },
  { id: 'football', label: 'Футбол', bg: 'bg-accent' },
  { id: 'tennis', label: 'Теннис', bg: 'bg-lilac' },
  { id: 'bike', label: 'Велосипед', bg: 'bg-accent-soft' },
  { id: 'chess', label: 'Шахматы', bg: 'bg-orange' },
  { id: 'custom', label: 'Свой спорт', bg: 'bg-lilac' },
]

export type AvatarView =
  | { kind: 'preset'; preset: AvatarPreset }
  | { kind: 'image'; src: string }
  | { kind: 'initials'; text: string; bg: string }

const INITIALS_BG = ['bg-orange', 'bg-accent', 'bg-lilac', 'bg-accent-soft']

export const presetAvatarUrl = (id: SportIconName) => PREFIX + id

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

export function avatarView(name: string, url: string | null | undefined): AvatarView {
  const value = url?.trim() ?? ''
  if (value.startsWith(PREFIX)) {
    const preset = AVATAR_PRESETS.find((p) => PREFIX + p.id === value)
    if (preset) return { kind: 'preset', preset }
  }
  // Картинки со сторонних адресов — только http(s), чтобы в src не попало что-то вроде javascript:.
  if (/^https?:\/\//i.test(value)) return { kind: 'image', src: value }
  // Цвет от имени, а не случайный: у человека он один и тот же на всех экранах.
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0
  return { kind: 'initials', text: initials(name), bg: INITIALS_BG[hash % INITIALS_BG.length]! }
}
