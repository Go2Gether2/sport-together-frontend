import type { MyParticipation } from '@/api'
import { t as tr } from '@/i18n'

export const CANCEL_REASON_MAX = 500

/** Причину отмены увидят все записавшиеся, поэтому она обязательна и осмысленна. */
export function cancelReasonError(text: string): string | null {
  const t = text.trim()
  if (!t) return tr('cancel.required')
  if (t.length < 5) return tr('cancel.short')
  if (t.length > CANCEL_REASON_MAX) return tr('common.maxLength', { n: CANCEL_REASON_MAX })
  return null
}

// Список записей не отдаёт причину отмены — её берём из карточки, только для отменённых.
export function cancelledEventIds(items: MyParticipation[]): number[] {
  return [...new Set(items.filter((i) => i.event.status === 'cancelled').map((i) => i.event.id))]
}
