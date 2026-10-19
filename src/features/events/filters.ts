import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type { EventFilters, JoinMode, Level } from '@/api'
import { quickDateRange, type QuickDate } from '@/utils/datetime'

const LEVELS: Level[] = ['beginner', 'amateur', 'pro']
const JOIN_MODES: JoinMode[] = ['open', 'approval']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: 'Новичок',
  amateur: 'Любитель',
  pro: 'Опытный',
}

export const JOIN_MODE_LABELS: Record<JoinMode, string> = {
  open: 'Свободная запись',
  approval: 'По заявке',
}

function str(value: LocationQuery[string] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

/** Фильтры из адресной строки: мусор отбрасываем, чтобы не слать его в API. */
export function filtersFromQuery(query: LocationQuery): EventFilters {
  const f: EventFilters = {}
  const q = str(query.q)
  if (q) f.q = q
  const sport = str(query.sport)
  if (sport) f.sport = sport
  const city = str(query.city)
  if (city) f.city = city
  const from = str(query.date_from)
  if (from && DATE_RE.test(from)) f.date_from = from
  const to = str(query.date_to)
  if (to && DATE_RE.test(to)) f.date_to = to
  const level = str(query.level) as Level | undefined
  if (level && LEVELS.includes(level)) f.level = level
  const mode = str(query.join_mode) as JoinMode | undefined
  if (mode && JOIN_MODES.includes(mode)) f.join_mode = mode
  const page = Number(str(query.page))
  if (Number.isInteger(page) && page > 1) f.page = page
  return f
}

export function filtersToQuery(f: EventFilters): LocationQueryRaw {
  const query: LocationQueryRaw = {}
  for (const [key, value] of Object.entries(f)) {
    if (value !== undefined && value !== '' && !(key === 'page' && value === 1))
      query[key] = String(value)
  }
  return query
}

export function activeQuickDate(f: EventFilters, now = new Date()): QuickDate | null {
  for (const kind of ['today', 'tomorrow', 'weekend'] as const) {
    const r = quickDateRange(kind, now)
    if (f.date_from === r.from && f.date_to === r.to) return kind
  }
  return null
}

/** Сколько фильтров выбрано (текст поиска не считаем). */
export function countFilters(f: EventFilters) {
  return [f.sport, f.city, f.date_from || f.date_to, f.level, f.join_mode].filter(Boolean).length
}
