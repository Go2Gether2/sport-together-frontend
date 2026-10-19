import { HttpResponse } from 'msw'
import type {
  ApiErrorBody,
  Comment,
  EventDetails,
  EventSummary,
  Organization,
  OrganizationShort,
  Participation,
  Sport,
  User,
  UserShort,
} from '@/api/types'
import { db, type CommentRow, type EventRow, type ParticipationRow, type UserRow } from './db'

export class MockError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message)
  }

  toResponse() {
    const body: ApiErrorBody = {
      error: {
        code: this.code,
        message: this.message,
        ...(this.fields ? { fields: this.fields } : {}),
      },
    }
    return HttpResponse.json(body, { status: this.status })
  }
}

export const fail = (
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
): never => {
  throw new MockError(status, code, message, fields)
}

export function currentUser(request: Request): UserRow | null {
  const header = request.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const userId = db.sessions.get(token)
  return db.users.find((u) => u.id === userId) ?? null
}

export function requireUser(request: Request): UserRow {
  return currentUser(request) ?? fail(401, 'unauthorized', 'Войдите, чтобы продолжить.')
}

export function requireAdmin(request: Request): UserRow {
  const user = requireUser(request)
  if (user.role !== 'admin') fail(403, 'forbidden', 'Раздел только для администратора.')
  return user
}

export const findUser = (id: string) => db.users.find((u) => u.id === id)
export const findOrg = (id: string) => db.organizations.find((o) => o.id === id)
export const findSport = (id: string) => db.sports.find((s) => s.id === id)
export const findEvent = (id: string) =>
  db.events.find((e) => e.id === id) ?? fail(404, 'not_found', 'Мероприятие не найдено.')

export const ownedOrg = (userId: string) => db.organizations.find((o) => o.owner_id === userId)

export function isOrganizer(event: EventRow, user: UserRow | null) {
  if (!user) return false
  if (event.organizer_user_id === user.id) return true
  const org = event.organizer_org_id ? findOrg(event.organizer_org_id) : undefined
  return org?.owner_id === user.id
}

export const isPast = (event: EventRow, now = new Date()) => new Date(event.starts_at) <= now

export const isActive = (p: ParticipationRow) => p.status === 'pending' || p.status === 'confirmed'

export function confirmedCount(eventId: string) {
  return db.participations.filter((p) => p.event_id === eventId && p.status === 'confirmed').length
}

export function myParticipation(eventId: string, userId: string) {
  const mine = db.participations
    .filter((p) => p.event_id === eventId && p.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  return mine.find(isActive) ?? mine[0] ?? null
}

export function unavailable(event: EventRow): never {
  const reason = event.moderation_reason ? `: ${event.moderation_reason}` : ''
  const what =
    event.status === 'deleted'
      ? 'удалено'
      : event.status === 'cancelled'
        ? 'отменено организатором'
        : 'снято с публикации'
  return fail(410, 'event_unavailable', `Мероприятие ${what}${reason}`)
}

export const toUserShort = (u: UserRow): UserShort => ({
  id: u.id,
  name: u.name,
  avatar_url: u.avatar_url,
})

export function toUser(u: UserRow): User {
  return {
    id: u.id,
    role: u.role,
    name: u.name,
    email: u.email,
    avatar_url: u.avatar_url,
    city: u.city,
    bio: u.bio,
    level: u.level,
    sport_ids: u.sport_ids,
    is_demo: u.is_demo,
    created_at: u.created_at,
  }
}

export const toSport = (s: (typeof db.sports)[number]): Sport => ({
  id: s.id,
  name: s.name,
  category: s.category,
  icon: s.icon,
  is_custom: s.is_custom,
})

export const toOrgShort = (o: Organization): OrganizationShort => ({ id: o.id, name: o.name })

export function toParticipation(p: ParticipationRow): Participation {
  return {
    id: p.id,
    event_id: p.event_id,
    user: toUserShort(findUser(p.user_id)!),
    status: p.status,
    message: p.message,
    decision_reason: p.decision_reason,
    decided_at: p.decided_at,
    created_at: p.created_at,
  }
}

export function toEventSummary(e: EventRow): EventSummary {
  const org =
    e.organizer_type === 'organization' && e.organizer_org_id
      ? findOrg(e.organizer_org_id)
      : undefined
  return {
    id: e.id,
    title: e.title,
    sport: toSport(findSport(e.sport_id)!),
    organizer: org
      ? { type: 'organization', organization: toOrgShort(org) }
      : { type: 'user', user: toUserShort(findUser(e.organizer_user_id)!) },
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    address: e.address,
    level: e.level,
    join_mode: e.join_mode,
    capacity: e.capacity,
    participants_count: confirmedCount(e.id),
    status: e.status,
  }
}

export function toEventDetails(e: EventRow, viewer: UserRow | null): EventDetails {
  const mine = viewer ? myParticipation(e.id, viewer.id) : null
  // Точное место и пояснения видят организатор и подтверждённые участники.
  const fullInfo =
    isOrganizer(e, viewer) || mine?.status === 'confirmed' || viewer?.role === 'admin'
  return {
    ...toEventSummary(e),
    description: e.description,
    location_note: fullInfo ? e.location_note : null,
    requirements: e.requirements,
    equipment: e.equipment,
    moderation_reason: e.moderation_reason,
    my_participation: mine ? toParticipation(mine) : null,
    created_at: e.created_at,
    updated_at: e.updated_at,
  }
}

export function toComment(c: CommentRow, { reveal = false } = {}): Comment {
  const event = db.events.find((e) => e.id === c.event_id)
  const author = findUser(c.author_id)!
  const asOrg = c.as_organization_id ? findOrg(c.as_organization_id) : undefined
  return {
    id: c.id,
    event_id: c.event_id,
    author: toUserShort(author),
    as_organization: asOrg ? toOrgShort(asOrg) : null,
    is_organizer: event ? isOrganizer(event, author) : false,
    parent_id: c.parent_id,
    text: c.is_hidden && !reveal ? '' : c.text,
    is_hidden: c.is_hidden,
    hidden_reason: c.hidden_reason,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }
}

export function paginate<T>(items: T[], page = 1, size = 20) {
  const safePage = Math.max(1, page)
  return {
    items: items.slice((safePage - 1) * size, safePage * size),
    total: items.length,
    page: safePage,
    size,
  }
}
