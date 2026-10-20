import type { EventSummary, Id, Level, MyParticipation } from '@/api'
import { inTimes, type TimeSlot } from '@/features/onboarding/onboarding'
import { t } from '@/i18n'

export interface RecommendationProfile {
  userId: Id
  sportIds: Id[]
  level: Level | null
  city: string | null
  organizationIds: Id[]
  /** Уровень по каждому виду из онбординга; без него — общий уровень профиля. */
  sportLevels?: Record<Id, Level>
  /** Удобное время из онбординга. */
  times?: TimeSlot[]
}

export interface Recommendation {
  event: EventSummary
  score: number
  /** 1–2 самых весомых причины — их видит пользователь. */
  reasons: string[]
}

const DAY = 24 * 60 * 60 * 1000
const HORIZON_DAYS = 30
const ACTIVE = new Set(['confirmed', 'pending', 'waitlist'])

// Веса — по правилам подборки из концепции (BR-REC-02); друзей, свайпов и погоды у нас нет,
// а «рядом» без координат профиля считаем по совпадению города.
const WEIGHTS = { sport: 30, level: 20, organizer: 10, city: 10, time: 10, seats: 5 } as const

function organizerKey(o: EventSummary['organizer']): string {
  return `${o.type}:${o.id}`
}

function isMine(event: EventSummary, profile: RecommendationProfile): boolean {
  const o = event.organizer
  return o.type === 'user' ? o.id === profile.userId : profile.organizationIds.includes(o.id)
}

/** Организаторы, у которых пользователь уже был: подтверждённая запись на прошедшее мероприятие. */
export function visitedOrganizers(
  participations: MyParticipation[],
  now = new Date(),
): Set<string> {
  return new Set(
    participations
      .filter((p) => p.participation.status === 'confirmed' && new Date(p.event.starts_at) < now)
      .map((p) => organizerKey(p.event.organizer)),
  )
}

/** Кандидаты: опубликованные мероприятия ближайших 30 дней, кроме своих и тех, куда уже записан. */
function candidates(
  events: EventSummary[],
  profile: RecommendationProfile,
  participations: MyParticipation[],
  now: Date,
): EventSummary[] {
  const joined = new Set(
    participations.filter((p) => ACTIVE.has(p.participation.status)).map((p) => p.event.id),
  )
  const horizon = now.getTime() + HORIZON_DAYS * DAY
  return events.filter((e) => {
    const start = new Date(e.starts_at).getTime()
    return (
      e.status === 'published' &&
      !e.is_past &&
      start > now.getTime() &&
      start <= horizon &&
      !isMine(e, profile) &&
      !joined.has(e.id)
    )
  })
}

/** Подборка «Для вас»: по баллам, при равенстве — что раньше. */
export function recommend(
  events: EventSummary[],
  profile: RecommendationProfile,
  participations: MyParticipation[],
  now = new Date(),
): Recommendation[] {
  const visited = visitedOrganizers(participations, now)
  const city = profile.city?.trim().toLowerCase()

  return candidates(events, profile, participations, now)
    .map((event) => {
      const signals: { weight: number; reason: string | null }[] = []
      if (profile.sportIds.includes(event.sport.id))
        signals.push({
          weight: WEIGHTS.sport,
          reason: t('forYou.reasons.sport', { sport: event.sport.name.toLowerCase() }),
        })
      const level = profile.sportLevels?.[event.sport.id] ?? profile.level
      if (level && event.level === level)
        signals.push({ weight: WEIGHTS.level, reason: t('forYou.reasons.level') })
      if (profile.times && inTimes(event.starts_at, profile.times))
        signals.push({ weight: WEIGHTS.time, reason: t('forYou.reasons.time') })
      if (visited.has(organizerKey(event.organizer)))
        signals.push({ weight: WEIGHTS.organizer, reason: t('forYou.reasons.organizer') })
      if (city && event.city?.trim().toLowerCase() === city)
        signals.push({ weight: WEIGHTS.city, reason: t('forYou.reasons.city') })
      if (event.capacity == null || event.confirmed_count < event.capacity)
        signals.push({ weight: WEIGHTS.seats, reason: null })
      const score = signals.reduce((sum, s) => sum + s.weight, 0)
      const reasons = signals
        .filter((s): s is { weight: number; reason: string } => s.reason !== null)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 2)
        .map((s) => s.reason)
      return { event, score, reasons }
    })
    .sort((a, b) => b.score - a.score || a.event.starts_at.localeCompare(b.event.starts_at))
}

/** Пустой профиль — подобрать не по чему, показываем популярное (BR-REC-05). */
export function popular(
  events: EventSummary[],
  profile: RecommendationProfile,
  participations: MyParticipation[],
  now = new Date(),
): EventSummary[] {
  return candidates(events, profile, participations, now).sort(
    (a, b) => b.confirmed_count - a.confirmed_count || a.starts_at.localeCompare(b.starts_at),
  )
}
