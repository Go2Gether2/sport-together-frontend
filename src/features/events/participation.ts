import type { EventDetails, Organization, User } from '@/api'

export type JoinAction =
  | { kind: 'login' }
  | { kind: 'organizer' }
  | { kind: 'admin' }
  | { kind: 'past' }
  | { kind: 'full' }
  | { kind: 'join' }
  | { kind: 'apply'; again: boolean }
  | { kind: 'pending' }
  | { kind: 'confirmed' }

export interface Viewer {
  user: User | null
  organization: Organization | null
}

/** Организатор с точки зрения интерфейса. Права всё равно проверяет сервер. */
export function isEventOrganizer(event: EventDetails, viewer: Viewer) {
  const o = event.organizer
  if (o.type === 'user') return o.user.id === viewer.user?.id
  return o.organization.id === viewer.organization?.id
}

/** Что показать в блоке записи. Порядок важен: своя запись важнее, чем «мест нет». */
export function joinAction(event: EventDetails, viewer: Viewer, now = new Date()): JoinAction {
  if (!viewer.user) return { kind: 'login' }
  if (viewer.user.role === 'admin') return { kind: 'admin' }
  if (isEventOrganizer(event, viewer)) return { kind: 'organizer' }

  const mine = event.my_participation
  if (mine?.status === 'confirmed') return { kind: 'confirmed' }
  if (mine?.status === 'pending') return { kind: 'pending' }

  if (new Date(event.starts_at) <= now) return { kind: 'past' }
  if (event.capacity !== null && event.participants_count >= event.capacity) return { kind: 'full' }

  if (event.join_mode === 'open') return { kind: 'join' }
  return { kind: 'apply', again: mine?.status === 'rejected' }
}
