import type { Comment, EventStatus, EventSummary } from '@/api'

export type EventStatusFilter = EventStatus | 'all'

export const EVENT_STATUS_FILTERS: { value: EventStatusFilter; label: string }[] = [
  { value: 'published', label: 'Опубликованы' },
  { value: 'unpublished', label: 'Сняты' },
  { value: 'deleted', label: 'Удалены' },
  { value: 'all', label: 'Все' },
]

export function parseEventStatusFilter(value: unknown): EventStatusFilter {
  return EVENT_STATUS_FILTERS.some((f) => f.value === value)
    ? (value as EventStatusFilter)
    : 'published'
}

export type ModerationAction = 'unpublish' | 'delete' | 'restore'

/** Что админ может сделать с мероприятием в этом статусе — по правилам бэка. */
export function moderationActions(status: EventStatus): ModerationAction[] {
  switch (status) {
    case 'published':
      return ['unpublish', 'delete']
    case 'unpublished':
      return ['restore', 'delete']
    default:
      return []
  }
}

/** Новый статус строки таблицы по ответу сервера. */
export function replaceEventStatus(
  list: EventSummary[],
  id: number,
  status: EventStatus,
): EventSummary[] {
  return list.map((e) => (e.id === id ? { ...e, status } : e))
}

export function replaceComment(list: Comment[], updated: Comment): Comment[] {
  return list.map((c) => (c.id === updated.id ? updated : c))
}

/** Причину увидят организатор и участники, поэтому она обязательна и осмысленна. */
export function moderationReasonError(text: string): string | null {
  const t = text.trim()
  if (!t) return 'Напишите причину — её увидят'
  if (t.length < 5) return 'Слишком коротко — объясните причину'
  if (t.length > 500) return 'Не длиннее 500 символов'
  return null
}
