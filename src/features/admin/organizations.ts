import type { Organization, OrganizationStatus, OrganizationType } from '@/api'

export const ORG_TYPE_LABELS: Record<OrganizationType, string> = {
  club: 'Клуб',
  community: 'Сообщество',
  federation: 'Федерация',
  company: 'Компания',
}

export type StatusFilter = OrganizationStatus | 'all'

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'pending', label: 'Ждут решения' },
  { value: 'approved', label: 'Допущены' },
  { value: 'rejected', label: 'Отклонены' },
  { value: 'all', label: 'Все' },
]

export function parseStatusFilter(value: unknown): StatusFilter {
  return STATUS_FILTERS.some((f) => f.value === value) ? (value as StatusFilter) : 'pending'
}

/** Обновляет строку в таблице ответом сервера, не перезагружая весь список. */
export function replaceOrganization(list: Organization[], updated: Organization): Organization[] {
  return list.map((o) => (o.id === updated.id ? updated : o))
}

export const REJECT_REASON_MAX = 500

/** Причину отказа организация увидит у себя, поэтому она обязательна и осмысленна. */
export function rejectReasonError(text: string): string | null {
  const t = text.trim()
  if (!t) return 'Напишите причину — организация её увидит'
  if (t.length < 5) return 'Слишком коротко — объясните, что исправить'
  if (t.length > REJECT_REASON_MAX) return `Не длиннее ${REJECT_REASON_MAX} символов`
  return null
}
