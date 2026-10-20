import { describe, it, expect } from 'vitest'
import type { EventSummary, MyParticipation } from '@/api'
import { popular, recommend, type RecommendationProfile } from '@/features/events/recommendations'

const now = new Date('2026-10-20T12:00:00Z')

function ev(id: number, patch: Partial<Record<string, unknown>> = {}): EventSummary {
  return {
    id,
    title: `Событие ${id}`,
    sport: { id: 1, name: 'Бег' },
    organizer: { type: 'user', id: 50, name: 'Орг', avatar_url: null },
    starts_at: '2026-10-25T08:00:00Z',
    ends_at: null,
    city: 'Москва',
    address: 'Парк',
    level: null,
    join_mode: 'open',
    capacity: null,
    confirmed_count: 0,
    status: 'published',
    is_past: false,
    is_edited: false,
    ...patch,
  } as unknown as EventSummary
}

function part(eventPatch: Partial<Record<string, unknown>>, status = 'confirmed'): MyParticipation {
  return { event: ev(900, eventPatch), participation: { status } } as unknown as MyParticipation
}

const anna: RecommendationProfile = {
  userId: 1,
  sportIds: [1],
  level: 'amateur',
  city: 'Красноярск',
  organizationIds: [7],
}

describe('recommend', () => {
  it('выше — совпавший вид спорта и уровень; причины самые весомые, не больше двух', () => {
    const list = recommend(
      [
        ev(1, { sport: { id: 2, name: 'Йога' } }),
        ev(2, { level: 'amateur', city: 'Красноярск' }),
        ev(3),
      ],
      anna,
      [],
      now,
    )
    expect(list.map((r) => r.event.id)).toEqual([2, 3, 1])
    expect(list[0]!.reasons).toEqual(['Вы любите: бег', 'Подходит вашему уровню'])
    expect(list[2]!.reasons).toEqual([])
  })

  it('учитывает организатора, у которого уже был', () => {
    const visited = part({ starts_at: '2026-10-01T08:00:00Z', organizer: { type: 'user', id: 60 } })
    const list = recommend(
      [ev(1, { sport: { id: 2, name: 'Йога' }, organizer: { type: 'user', id: 60 } })],
      anna,
      [visited],
      now,
    )
    expect(list[0]!.reasons).toEqual(['Вы уже были у этого организатора'])
  })

  it('без своих, уже записанных, снятых, прошедших и дальше 30 дней', () => {
    const list = recommend(
      [
        ev(1, { organizer: { type: 'user', id: 1 } }),
        ev(2, { organizer: { type: 'organization', id: 7 } }),
        ev(3),
        ev(4, { status: 'cancelled' }),
        ev(5, { starts_at: '2026-10-19T08:00:00Z' }),
        ev(6, { starts_at: '2026-12-01T08:00:00Z' }),
        ev(7),
      ],
      anna,
      [part({ id: 3 }, 'pending')].map((p) => ({ ...p, event: ev(3) })),
      now,
    )
    expect(list.map((r) => r.event.id)).toEqual([7])
  })

  it('при равных баллах — что раньше', () => {
    const list = recommend(
      [ev(1, { starts_at: '2026-10-28T08:00:00Z' }), ev(2, { starts_at: '2026-10-22T08:00:00Z' })],
      anna,
      [],
      now,
    )
    expect(list.map((r) => r.event.id)).toEqual([2, 1])
  })

  it('смена интересов меняет выдачу', () => {
    const events = [ev(1), ev(2, { sport: { id: 2, name: 'Йога' } })]
    expect(recommend(events, anna, [], now)[0]!.event.id).toBe(1)
    expect(recommend(events, { ...anna, sportIds: [2] }, [], now)[0]!.event.id).toBe(2)
  })
})

describe('popular', () => {
  it('по числу участников, без прошедших и своих', () => {
    const list = popular(
      [
        ev(1, { confirmed_count: 2 }),
        ev(2, { confirmed_count: 9 }),
        ev(3, { is_past: true }),
        ev(4, { confirmed_count: 20, organizer: { type: 'user', id: 1 } }),
      ],
      { ...anna, sportIds: [] },
      [],
      now,
    )
    expect(list.map((e) => e.id)).toEqual([2, 1])
  })
})

describe('ответы онбординга в подборке', () => {
  it('уровень по виду спорта важнее общего, удобное время — тоже причина', () => {
    const list = recommend(
      [ev(1, { level: 'pro', starts_at: new Date('2026-10-25T08:00:00').toISOString() })],
      { ...anna, sportLevels: { 1: 'pro' }, times: ['weekend'] },
      [],
      now,
    )
    expect(list[0]!.reasons).toEqual(['Вы любите: бег', 'Подходит вашему уровню'])
    expect(list[0]!.score).toBe(30 + 20 + 10 + 5)
  })
})
