import { describe, it, expect } from 'vitest'
import type { MyParticipation } from '@/api'
import { cancelReasonError, cancelledEventIds } from '@/features/events/cancelEvent'

describe('cancelReasonError', () => {
  it('причина обязательна, осмысленна и не длиннее 500', () => {
    expect(cancelReasonError('  ')).toBeTruthy()
    expect(cancelReasonError('нет')).toBeTruthy()
    expect(cancelReasonError('x'.repeat(501))).toBeTruthy()
    expect(cancelReasonError(' Заболел тренер ')).toBeNull()
  })
})

describe('cancelledEventIds', () => {
  it('только отменённые мероприятия, без повторов', () => {
    const item = (id: number, status: string) =>
      ({ event: { id, status }, participation: {} }) as unknown as MyParticipation
    expect(
      cancelledEventIds([
        item(1, 'published'),
        item(2, 'cancelled'),
        item(2, 'cancelled'),
        item(3, 'unpublished'),
      ]),
    ).toEqual([2])
  })
})
