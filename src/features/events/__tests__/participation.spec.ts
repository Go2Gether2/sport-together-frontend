import { describe, expect, it } from 'vitest'
import type { EventDetails, Organization, Participation, User } from '@/api'
import { joinAction } from '../participation'

const now = new Date('2026-10-21T12:00:00Z')

const user = (id: string, role: User['role'] = 'user') => ({ id, role }) as User

function event(extra: Partial<EventDetails> = {}): EventDetails {
  return {
    id: 'e',
    title: 'Футбол',
    starts_at: '2026-10-22T12:00:00Z',
    join_mode: 'open',
    capacity: null,
    participants_count: 0,
    my_participation: null,
    organizer: { type: 'user', user: { id: 'u-org', name: 'Анна', avatar_url: null } },
    ...extra,
  } as EventDetails
}

const mine = (status: Participation['status']) => ({ status }) as Participation

const viewer = (u: User | null, organization: Organization | null = null) => ({
  user: u,
  organization,
})

describe('joinAction', () => {
  it('гостю предлагает войти', () => {
    expect(joinAction(event(), viewer(null), now)).toEqual({ kind: 'login' })
  })

  it('организатор и администратор не записываются', () => {
    expect(joinAction(event(), viewer(user('u-org')), now).kind).toBe('organizer')
    const byOrg = event({
      organizer: { type: 'organization', organization: { id: 'o-1', name: 'Клуб' } },
    })
    expect(joinAction(byOrg, viewer(user('u-x'), { id: 'o-1' } as Organization), now).kind).toBe(
      'organizer',
    )
    expect(joinAction(event(), viewer(user('u-a', 'admin')), now).kind).toBe('admin')
  })

  it('свободная запись и заявка', () => {
    expect(joinAction(event(), viewer(user('u-1')), now)).toEqual({ kind: 'join' })
    expect(joinAction(event({ join_mode: 'approval' }), viewer(user('u-1')), now)).toEqual({
      kind: 'apply',
      again: false,
    })
  })

  it('своя запись важнее, чем «мест нет» и «прошло»', () => {
    const full = event({ capacity: 2, participants_count: 2, my_participation: mine('confirmed') })
    expect(joinAction(full, viewer(user('u-1')), now).kind).toBe('confirmed')
    const pending = event({ join_mode: 'approval', my_participation: mine('pending') })
    expect(joinAction(pending, viewer(user('u-1')), now).kind).toBe('pending')
  })

  it('прошедшее и заполненное', () => {
    expect(
      joinAction(event({ starts_at: '2026-10-20T12:00:00Z' }), viewer(user('u-1')), now).kind,
    ).toBe('past')
    expect(
      joinAction(event({ capacity: 2, participants_count: 2 }), viewer(user('u-1')), now).kind,
    ).toBe('full')
  })

  it('после отказа можно подать заявку снова, после отмены — записаться снова', () => {
    const rejected = event({ join_mode: 'approval', my_participation: mine('rejected') })
    expect(joinAction(rejected, viewer(user('u-1')), now)).toEqual({ kind: 'apply', again: true })
    expect(
      joinAction(event({ my_participation: mine('cancelled') }), viewer(user('u-1')), now).kind,
    ).toBe('join')
  })
})
