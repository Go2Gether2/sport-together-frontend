import { describe, expect, it } from 'vitest'
import { activeQuickDate, countFilters, filtersFromQuery, filtersToQuery } from '../filters'

describe('фильтры каталога', () => {
  it('читает адресную строку и отбрасывает мусор', () => {
    expect(
      filtersFromQuery({
        q: ' бег ',
        sport: 's-running',
        level: 'god',
        join_mode: 'open',
        date_from: '2026-10-24',
        date_to: 'завтра',
        page: '0',
      }),
    ).toEqual({ q: 'бег', sport: 's-running', join_mode: 'open', date_from: '2026-10-24' })
  })

  it('пишет в адресную строку только заданное, первую страницу не пишет', () => {
    expect(filtersToQuery({ q: 'йога', page: 1, level: 'beginner' })).toEqual({
      q: 'йога',
      level: 'beginner',
    })
    expect(filtersToQuery({ page: 3 })).toEqual({ page: '3' })
  })

  it('узнаёт быструю дату', () => {
    const now = new Date(2026, 9, 21, 12)
    expect(activeQuickDate({ date_from: '2026-10-24', date_to: '2026-10-25' }, now)).toBe('weekend')
    expect(activeQuickDate({ date_from: '2026-10-24' }, now)).toBeNull()
  })

  it('считает выбранные фильтры без текста поиска', () => {
    expect(
      countFilters({ q: 'бег', sport: 's', date_from: 'x', date_to: 'y', join_mode: 'open' }),
    ).toBe(3)
  })
})
