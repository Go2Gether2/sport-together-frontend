import type { Id, Level, ProfileInput, User } from '@/api'

export const STEPS = 5
export const MAX_SPORTS = 10

export type TimeSlot = 'morning' | 'day' | 'evening' | 'weekend'
export type AgePreset = 'any' | 'young' | 'mid' | 'senior'

export const TIME_SLOTS: { id: TimeSlot; label: string; hint: string }[] = [
  { id: 'morning', label: 'Утро', hint: 'до 11:00' },
  { id: 'day', label: 'День', hint: '11:00–17:00' },
  { id: 'evening', label: 'Вечер', hint: 'после 17:00' },
  { id: 'weekend', label: 'Выходные', hint: 'суббота и воскресенье' },
]

export const AGE_PRESETS: { id: AgePreset; label: string; from: string; to: string }[] = [
  { id: 'any', label: 'Не важно', from: '', to: '' },
  { id: 'young', label: '18–25', from: '18', to: '25' },
  { id: 'mid', label: '25–40', from: '25', to: '40' },
  { id: 'senior', label: '40+', from: '40', to: '99' },
]

export interface OnboardingAnswers {
  avatar: string
  name: string
  birthYear: string
  city: string
  /** Вид спорта → уровень в нём. */
  sports: Record<Id, Level>
  radiusKm: number
  times: TimeSlot[]
  ageFrom: string
  ageTo: string
}

/** То, чего нет в API профиля: живёт только в этом браузере. */
export type LocalPrefs = Pick<
  OnboardingAnswers,
  'birthYear' | 'sports' | 'radiusKm' | 'times' | 'ageFrom' | 'ageTo'
>

export type OnboardingErrors = Partial<Record<'name' | 'birthYear' | 'ageFrom' | 'ageTo', string>>

// Vue отдаёт значение поля type="number" числом, а не строкой — приводим перед проверками.
const text = (v: unknown) => String(v ?? '').trim()

export function answersFrom(user: User, local: LocalPrefs | null): OnboardingAnswers {
  const sports: Record<Id, Level> = {}
  for (const id of user.sport_ids) sports[id] = local?.sports[id] ?? user.level ?? 'beginner'
  return {
    avatar: user.avatar_url ?? '',
    name: user.name,
    birthYear: local?.birthYear ?? '',
    city: user.city ?? '',
    sports,
    radiusKm: local?.radiusKm ?? 10,
    times: local?.times ?? [],
    ageFrom: local?.ageFrom ?? '',
    ageTo: local?.ageTo ?? '',
  }
}

export function validateAbout(a: OnboardingAnswers, now = new Date()): OnboardingErrors {
  const errors: OnboardingErrors = {}
  const name = a.name.trim()
  if (!name) errors.name = 'Как к вам обращаться?'
  else if (name.length > 60) errors.name = 'Не длиннее 60 символов'
  const year = text(a.birthYear)
  if (year) {
    const y = Number(year)
    const max = now.getFullYear() - 10
    if (!Number.isInteger(y) || y < 1920 || y > max) errors.birthYear = `Год от 1920 до ${max}`
  }
  return errors
}

export function validateAge(a: OnboardingAnswers): OnboardingErrors {
  const errors: OnboardingErrors = {}
  const from = text(a.ageFrom) ? Number(a.ageFrom) : null
  const to = text(a.ageTo) ? Number(a.ageTo) : null
  const bad = (n: number | null) => n !== null && (!Number.isInteger(n) || n < 10 || n > 99)
  if (bad(from)) errors.ageFrom = 'От 10 до 99'
  if (bad(to)) errors.ageTo = 'От 10 до 99'
  if (!errors.ageFrom && !errors.ageTo && from !== null && to !== null && from > to)
    errors.ageTo = 'Не меньше, чем «от»'
  return errors
}

/** Выбрать или снять вид спорта; больше MAX_SPORTS не даём. */
export function toggleSport(sports: Record<Id, Level>, id: Id): Record<Id, Level> {
  const next = { ...sports }
  if (id in next) delete next[id]
  else if (Object.keys(next).length < MAX_SPORTS) next[id] = 'beginner'
  return next
}

// В API уровень один на человека — берём самый частый из выбранных, при равенстве — что выше.
const LEVEL_ORDER: Level[] = ['beginner', 'amateur', 'pro']
export function overallLevel(sports: Record<Id, Level>): Level | undefined {
  const counts = new Map<Level, number>()
  for (const l of Object.values(sports)) counts.set(l, (counts.get(l) ?? 0) + 1)
  let best: Level | undefined
  for (const l of LEVEL_ORDER) if ((counts.get(l) ?? 0) >= (counts.get(best!) ?? 1)) best = l
  return best
}

/** Тело PATCH /users/me — только поля, которые есть в API. */
export function toProfileUpdate(a: OnboardingAnswers): ProfileInput {
  return {
    name: a.name.trim(),
    city: a.city.trim(),
    avatar_url: a.avatar || undefined,
    sport_ids: Object.keys(a.sports).map(Number),
    level: overallLevel(a.sports),
  }
}

export function toLocalPrefs(a: OnboardingAnswers): LocalPrefs {
  return {
    birthYear: text(a.birthYear),
    sports: a.sports,
    radiusKm: a.radiusKm,
    times: a.times,
    ageFrom: text(a.ageFrom),
    ageTo: text(a.ageTo),
  }
}

export function agePresetOf(a: Pick<OnboardingAnswers, 'ageFrom' | 'ageTo'>): AgePreset | null {
  return AGE_PRESETS.find((p) => p.from === text(a.ageFrom) && p.to === text(a.ageTo))?.id ?? null
}

/** Попадает ли начало мероприятия в удобное время (по местным часам). */
export function inTimes(startsAt: string, times: TimeSlot[]): boolean {
  if (!times.length) return false
  const d = new Date(startsAt)
  const weekend = d.getDay() === 0 || d.getDay() === 6
  const h = d.getHours()
  const slot: TimeSlot = h < 11 ? 'morning' : h < 17 ? 'day' : 'evening'
  return (weekend && times.includes('weekend')) || times.includes(slot)
}

const KEY = (userId: Id) => `vmeste:onboarding:${userId}`

// Хранилище может быть недоступно (приватный режим) — тогда просто не помним ответы.
export function loadLocalPrefs(userId: Id): LocalPrefs | null {
  try {
    const raw = localStorage.getItem(KEY(userId))
    return raw ? (JSON.parse(raw) as LocalPrefs) : null
  } catch {
    return null
  }
}

export function saveLocalPrefs(userId: Id, prefs: LocalPrefs) {
  try {
    localStorage.setItem(KEY(userId), JSON.stringify(prefs))
  } catch {
    // нет хранилища — ответы останутся только на время сессии
  }
}
