import type { EventStatus, OrganizationStatus, ParticipationStatus } from '@/api/types'

// Статусы различаются формой и значком, а не цветом (ADR 0002): так их читают и при нарушении цветовосприятия.
export type StatusTone = 'ok' | 'wait' | 'no' | 'off'

export interface StatusView {
  tone: StatusTone
  label: string
}

const participation: Record<ParticipationStatus, StatusView> = {
  confirmed: { tone: 'ok', label: 'Вы участник' },
  pending: { tone: 'wait', label: 'Ждёт решения' },
  waitlisted: { tone: 'wait', label: 'В листе ожидания' },
  rejected: { tone: 'no', label: 'Заявка отклонена' },
  cancelled: { tone: 'off', label: 'Запись отменена' },
}

const event: Record<EventStatus, StatusView> = {
  published: { tone: 'ok', label: 'Опубликовано' },
  unpublished: { tone: 'off', label: 'Снято с публикации' },
  deleted: { tone: 'off', label: 'Удалено' },
  cancelled: { tone: 'off', label: 'Отменено' },
}

const organization: Record<OrganizationStatus, StatusView> = {
  approved: { tone: 'ok', label: 'Допущена' },
  pending: { tone: 'wait', label: 'На рассмотрении' },
  rejected: { tone: 'no', label: 'Отклонена' },
  blocked: { tone: 'off', label: 'Заблокирована' },
}

export type StatusOf =
  | { kind: 'participation'; status: ParticipationStatus }
  | { kind: 'event'; status: EventStatus }
  | { kind: 'organization'; status: OrganizationStatus }

export function statusView(s: StatusOf): StatusView {
  switch (s.kind) {
    case 'participation':
      return participation[s.status]
    case 'event':
      return event[s.status]
    case 'organization':
      return organization[s.status]
  }
}

export const toneIcon: Record<StatusTone, string> = {
  ok: '✓',
  wait: '◷',
  no: '✕',
  off: '',
}
