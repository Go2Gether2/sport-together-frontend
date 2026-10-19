import type { MyParticipation } from '@/api'

export const CANCEL_REASON_MAX = 500

/** Причину отмены увидят все записавшиеся, поэтому она обязательна и осмысленна. */
export function cancelReasonError(text: string): string | null {
  const t = text.trim()
  if (!t) return 'Напишите причину — участники её увидят'
  if (t.length < 5) return 'Слишком коротко — объясните участникам, что случилось'
  if (t.length > CANCEL_REASON_MAX) return `Не длиннее ${CANCEL_REASON_MAX} символов`
  return null
}

// Список записей не отдаёт причину отмены — её берём из карточки, только для отменённых.
export function cancelledEventIds(items: MyParticipation[]): number[] {
  return [...new Set(items.filter((i) => i.event.status === 'cancelled').map((i) => i.event.id))]
}
