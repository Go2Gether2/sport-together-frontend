import { http, HttpResponse, delay, type DefaultBodyType, type PathParams } from 'msw'
import type {
  CommentInput,
  DemoAccount,
  EventInput,
  EventStatus,
  Id,
  Me,
  OrganizationInput,
  OrganizationStatus,
  ParticipationStatus,
} from '@/api/types'
import { API_BASE } from '@/api/http'
import {
  db,
  newId,
  newToken,
  normalizeName,
  type EventRow,
  type ModerationRow,
  type OrganizationRow,
  type ParticipationRow,
  type UserRow,
} from './db'
import {
  MockError,
  confirmedCount,
  currentUser,
  fail,
  findEvent,
  findOrg,
  findUser,
  isActive,
  isOrganizer,
  isPast,
  myParticipation,
  ownedOrgs,
  paginate,
  requireAdmin,
  requireUser,
  toComment,
  toEventDetails,
  toEventSummary,
  toOrgShort,
  toOrganization,
  toParticipant,
  toParticipation,
  toSport,
  toUser,
  toUserShort,
  unavailable,
  validation,
} from './model'

type Ctx = { request: Request; params: PathParams }
type Resolver = (ctx: Ctx) => unknown | Promise<unknown>

const url = (path: string) => `*${API_BASE}${path}`

function route(resolver: Resolver) {
  return async ({ request, params }: Ctx) => {
    // Небольшая задержка, чтобы в интерфейсе были видны состояния загрузки.
    if (import.meta.env.MODE !== 'test') await delay(250)
    try {
      const result = await resolver({ request, params })
      if (result instanceof Response) return result
      return HttpResponse.json(result as DefaultBodyType)
    } catch (error) {
      if (error instanceof MockError) return error.toResponse()
      throw error
    }
  }
}

const created = (body: DefaultBodyType) => HttpResponse.json(body, { status: 201 })
const noContent = () => new HttpResponse(null, { status: 204 })

async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return ((await request.json()) ?? {}) as Partial<T>
  } catch {
    return {}
  }
}

const idParam = (params: PathParams, key: string): Id => {
  const id = Number(params[key])
  return Number.isInteger(id) ? id : fail(404, 'NOT_FOUND', 'Не найдено')
}
const nowIso = () => new Date().toISOString()
const search = (request: Request) => new URL(request.url).searchParams
const numberParam = (sp: URLSearchParams, key: string) => {
  const v = sp.get(key)
  return v === null || v === '' ? undefined : Number(v)
}
const pageOf = <T>(items: T[], sp: URLSearchParams) =>
  paginate(items, numberParam(sp, 'page') ?? 0, numberParam(sp, 'size') ?? 20)

function login(user: UserRow) {
  const token = newToken()
  db.sessions.set(token, user.id)
  return { token, token_type: 'Bearer', expires_in: 86400, user: toUser(user) }
}

function me(user: UserRow): Me {
  return { user: toUser(user), organizations: ownedOrgs(user.id).map(toOrgShort) }
}

function log(
  admin: UserRow,
  action: ModerationRow['action'],
  target: ModerationRow['target_type'],
  id: Id,
  reason: string | null,
) {
  db.moderation.unshift({
    id: newId(),
    admin_id: admin.id,
    action,
    target_type: target,
    target_id: id,
    reason,
    created_at: nowIso(),
  })
}

function resolveSport(input: Partial<EventInput>, user: UserRow) {
  if (input.sport_id) {
    return (
      db.sports.find((s) => s.id === input.sport_id) ??
      validation({ sport_id: 'Такого направления нет' })
    )
  }
  const name = input.sport_name?.trim()
  if (!name) return validation({ sport_id: 'Выберите направление или впишите своё' })
  const normalized = normalizeName(name)
  const existing = db.sports.find((s) => s.normalized_name === normalized)
  if (existing) return existing
  const sport = {
    id: newId(),
    name,
    category: 'other' as const,
    icon: null,
    is_custom: true,
    normalized_name: normalized,
    created_by: user.id,
  }
  db.sports.push(sport)
  return sport
}

function validateEvent(input: Partial<EventInput>) {
  const fields: Record<string, string> = {}
  if (!input.title?.trim()) fields.title = 'не должно быть пустым'
  if (!input.address?.trim()) fields.address = 'не должно быть пустым'
  if (!input.starts_at || Number.isNaN(Date.parse(input.starts_at)))
    fields.starts_at = 'не должно равняться null'
  else if (new Date(input.starts_at) <= new Date())
    fields.starts_at = 'Время начала должно быть в будущем'
  if (input.join_mode !== 'open' && input.join_mode !== 'approval')
    fields.join_mode = 'Выберите режим записи'
  if (
    input.capacity !== undefined &&
    input.capacity !== null &&
    (!Number.isInteger(input.capacity) || input.capacity < 1)
  )
    fields.capacity = 'Не меньше одного места'
  if (Object.keys(fields).length) validation(fields)
}

function publishedEvent(id: Id) {
  const event = findEvent(id)
  if (event.status !== 'published') unavailable(event)
  return event
}

/** Как у бэка: снятое событие видят участники, организатор и админ (с причиной), остальным — 410. */
function visibleEvent(id: Id, viewer: UserRow | null) {
  const event = findEvent(id)
  const involved =
    viewer &&
    (viewer.role === 'admin' ||
      isOrganizer(event, viewer) ||
      db.participations.some((p) => p.event_id === event.id && p.user_id === viewer.id))
  if (event.status !== 'published' && !involved) unavailable(event)
  return event
}

function requireOrganizer(event: EventRow, user: UserRow) {
  if (!isOrganizer(event, user))
    fail(403, 'FORBIDDEN', 'Это может сделать только организатор мероприятия')
}

function findOrgOr404(id: Id): OrganizationRow {
  return findOrg(id) ?? fail(404, 'NOT_FOUND', 'Организация не найдена')
}

function participationOr404(id: Id): ParticipationRow {
  return db.participations.find((x) => x.id === id) ?? fail(404, 'NOT_FOUND', 'Заявка не найдена')
}

export const handlers = [
  // ── Auth
  http.get(
    url('/auth/demo-accounts'),
    route(() =>
      db.users
        .filter((u) => u.is_demo)
        .map((u): DemoAccount => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          description: u.demo_description ?? '',
        })),
    ),
  ),

  http.post(
    url('/auth/login'),
    route(async ({ request }) => {
      const body = await readJson<{ email: string; password: string; demo_account_id: number }>(
        request,
      )
      const user = body.demo_account_id
        ? db.users.find((u) => u.is_demo && u.id === Number(body.demo_account_id))
        : db.users.find(
            (u) => u.email === body.email?.trim().toLowerCase() && u.password === body.password,
          )
      if (!user) fail(401, 'INVALID_CREDENTIALS', 'Неверный email или пароль')
      return login(user!)
    }),
  ),

  http.post(
    url('/auth/register'),
    route(async ({ request }) => {
      const body = await readJson<{ name: string; email: string; password: string }>(request)
      const fields: Record<string, string> = {}
      const email = body.email?.trim().toLowerCase() ?? ''
      if (!body.name?.trim()) fields.name = 'не должно быть пустым'
      if (!/^\S+@\S+\.\S+$/.test(email))
        fields.email = 'должно иметь формат адреса электронной почты'
      if (!body.password || body.password.length < 6) fields.password = 'Не короче 6 символов'
      if (Object.keys(fields).length) validation(fields)
      if (db.users.some((u) => u.email === email))
        fail(409, 'EMAIL_TAKEN', 'Этот email уже зарегистрирован')
      const user: UserRow = {
        id: newId(),
        role: 'user',
        name: body.name!.trim(),
        email,
        password: body.password!,
        avatar_url: null,
        city: null,
        bio: null,
        level: null,
        sport_ids: [],
        is_demo: false,
        created_at: nowIso(),
        contacts: null,
        demo_description: null,
      }
      db.users.push(user)
      return created(login(user))
    }),
  ),

  http.post(
    url('/auth/logout'),
    route(({ request }) => {
      const token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
      db.sessions.delete(token)
      return noContent()
    }),
  ),

  http.get(
    url('/auth/me'),
    route(({ request }) => me(requireUser(request))),
  ),

  // ── Users
  http.get(
    url('/users/me/events'),
    route(({ request }) => {
      const user = requireUser(request)
      const count = (eventId: Id, status: ParticipationStatus) =>
        db.participations.filter((p) => p.event_id === eventId && p.status === status).length
      return db.events
        .filter((e) => isOrganizer(e, user) && e.status !== 'deleted')
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        .map((e) => ({
          event: toEventSummary(e),
          pending_count: count(e.id, 'pending'),
          waitlisted_count: count(e.id, 'waitlist'),
        }))
    }),
  ),

  http.get(
    url('/users/me/participations'),
    route(({ request }) => {
      const user = requireUser(request)
      const status = search(request).get('status') as ParticipationStatus | null
      return db.participations
        .filter((p) => p.user_id === user.id && (!status || p.status === status))
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
        .map((p) => ({
          participation: toParticipation(p),
          event: toEventSummary(findEvent(p.event_id)),
        }))
    }),
  ),

  http.patch(
    url('/users/me'),
    route(async ({ request }) => {
      const user = requireUser(request)
      const body =
        await readJson<
          Pick<UserRow, 'name' | 'city' | 'bio' | 'sport_ids' | 'level' | 'avatar_url'>
        >(request)
      if (body.name !== undefined && !body.name.trim())
        validation({ name: 'не должно быть пустым' })
      Object.assign(user, body)
      return toUser(user)
    }),
  ),

  http.get(
    url('/users/:id'),
    route(({ params }) => {
      const user =
        findUser(idParam(params, 'id')) ?? fail(404, 'NOT_FOUND', 'Пользователь не найден')
      return {
        id: user.id,
        name: user.name,
        avatar_url: user.avatar_url,
        city: user.city,
        bio: user.bio,
        level: user.level,
        sports: db.sports.filter((s) => user.sport_ids.includes(s.id)).map(toSport),
        created_events: db.events
          .filter(
            (e) =>
              e.organizer_type === 'user' &&
              e.organizer_user_id === user.id &&
              e.status === 'published' &&
              !isPast(e),
          )
          .map(toEventSummary),
      }
    }),
  ),

  // ── Sports
  http.get(
    url('/sports'),
    route(({ request }) => {
      const q = normalizeName(search(request).get('q') ?? '')
      return db.sports
        .filter((s) => !q || s.normalized_name.includes(q))
        .sort(
          (a, b) => Number(a.is_custom) - Number(b.is_custom) || a.name.localeCompare(b.name, 'ru'),
        )
        .map(toSport)
    }),
  ),

  http.post(
    url('/sports'),
    route(async ({ request }) => {
      const user = requireUser(request)
      const body = await readJson<{ name: string }>(request)
      return created(toSport(resolveSport({ sport_name: body.name }, user)))
    }),
  ),

  http.get(
    url('/sports/:id'),
    route(({ params }) => {
      const sport =
        db.sports.find((s) => s.id === idParam(params, 'id')) ??
        fail(404, 'NOT_FOUND', 'Направление не найдено')
      const active = db.events.filter(
        (e) => e.sport_id === sport.id && e.status === 'published' && !isPast(e),
      ).length
      return { ...toSport(sport), active_events_count: active }
    }),
  ),

  // ── Events
  http.get(
    url('/events'),
    route(({ request }) => {
      const sp = search(request)
      const q = normalizeName(sp.get('q') ?? '')
      const sport = numberParam(sp, 'sport')
      const city = normalizeName(sp.get('city') ?? '')
      const from = sp.get('date_from')
      const to = sp.get('date_to')
      const level = sp.get('level')
      const mode = sp.get('join_mode')
      const organizer = numberParam(sp, 'organizer')
      const organization = numberParam(sp, 'organization')
      const items = db.events
        .filter((e) => e.status === 'published' && !isPast(e))
        .filter((e) => !q || normalizeName(`${e.title} ${e.description ?? ''}`).includes(q))
        .filter((e) => !sport || e.sport_id === sport)
        .filter((e) => !city || normalizeName(`${e.city ?? ''} ${e.address}`).includes(city))
        .filter((e) => !from || e.starts_at.slice(0, 10) >= from)
        .filter((e) => !to || e.starts_at.slice(0, 10) <= to)
        .filter((e) => !level || e.level === level)
        .filter((e) => !mode || e.join_mode === mode)
        .filter((e) => !organizer || e.organizer_user_id === organizer)
        .filter((e) => !organization || e.organizer_org_id === organization)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        .map(toEventSummary)
      return pageOf(items, sp)
    }),
  ),

  http.post(
    url('/events'),
    route(async ({ request }) => {
      const user = requireUser(request)
      if (user.role === 'admin') fail(403, 'FORBIDDEN', 'Администратор не создаёт мероприятия')
      const input = await readJson<EventInput>(request)
      if (input.organization_id) {
        const org = findOrg(input.organization_id)
        if (!org || org.owner_id !== user.id || org.status !== 'approved')
          fail(403, 'ORGANIZATION_NOT_APPROVED', 'Организация ещё не допущена к публикации')
      }
      validateEvent(input)
      const sport = resolveSport(input, user)
      const ts = nowIso()
      const event: EventRow = {
        id: newId(),
        title: input.title!.trim(),
        description: input.description?.trim() || null,
        sport_id: sport.id,
        organizer_type: input.organization_id ? 'organization' : 'user',
        organizer_user_id: user.id,
        organizer_org_id: input.organization_id ?? null,
        starts_at: input.starts_at!,
        ends_at: input.ends_at ?? null,
        city: input.city?.trim() || null,
        address: input.address!.trim(),
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        location_note: input.location_note?.trim() || null,
        level: input.level ?? null,
        requirements: input.requirements?.trim() || null,
        equipment: input.equipment?.trim() || null,
        join_mode: input.join_mode!,
        capacity: input.capacity ?? null,
        status: 'published',
        moderation_reason: null,
        created_at: ts,
        updated_at: ts,
      }
      db.events.push(event)
      return created(toEventDetails(event, user))
    }),
  ),

  http.get(
    url('/events/:id'),
    route(({ request, params }) => {
      const viewer = currentUser(request)
      return toEventDetails(visibleEvent(idParam(params, 'id'), viewer), viewer)
    }),
  ),

  http.patch(
    url('/events/:id'),
    route(async ({ request, params }) => {
      const user = requireUser(request)
      const event = publishedEvent(idParam(params, 'id'))
      requireOrganizer(event, user)
      const input = await readJson<EventInput>(request)
      validateEvent({
        title: input.title ?? event.title,
        address: input.address ?? event.address,
        starts_at: input.starts_at ?? event.starts_at,
        join_mode: input.join_mode ?? event.join_mode,
        capacity: input.capacity ?? event.capacity ?? undefined,
      })
      const sport = input.sport_id || input.sport_name ? resolveSport(input, user) : null
      const { sport_name: _name, organization_id: _org, ...rest } = input
      void _name
      void _org
      Object.assign(event, rest, { sport_id: sport?.id ?? event.sport_id, updated_at: nowIso() })
      return toEventDetails(event, user)
    }),
  ),

  http.post(
    url('/events/:id/cancel'),
    route(async ({ request, params }) => {
      const user = requireUser(request)
      const event = publishedEvent(idParam(params, 'id'))
      requireOrganizer(event, user)
      const { reason } = await readJson<{ reason: string }>(request)
      if (!reason?.trim()) validation({ reason: 'не должно быть пустым' })
      Object.assign(event, {
        status: 'cancelled',
        moderation_reason: reason!.trim(),
        updated_at: nowIso(),
      })
      return toEventDetails(event, user)
    }),
  ),

  http.post(
    url('/events/:id/join'),
    route(async ({ request, params }) => {
      const user = requireUser(request)
      if (user.role === 'admin')
        fail(403, 'FORBIDDEN', 'Администратор не записывается на мероприятия')
      const event = publishedEvent(idParam(params, 'id'))
      if (isPast(event)) fail(409, 'EVENT_PAST', 'Мероприятие уже прошло')
      if (isOrganizer(event, user)) fail(409, 'OWN_EVENT', 'Нельзя записаться на своё мероприятие')
      const current = myParticipation(event.id, user.id)
      if (current && isActive(current))
        fail(409, 'ALREADY_JOINED', 'У вас уже есть активная запись', {
          participation_id: String(current.id),
          status: current.status,
        })
      if (event.capacity && confirmedCount(event.id) >= event.capacity)
        fail(409, 'NO_PLACES', 'Мест больше нет')
      const { message } = await readJson<{ message: string }>(request)
      const ts = nowIso()
      const open = event.join_mode === 'open'
      const participation: ParticipationRow = {
        id: newId(),
        event_id: event.id,
        user_id: user.id,
        status: open ? 'confirmed' : 'pending',
        message: message?.trim() || null,
        decision_reason: null,
        decided_at: open ? ts : null,
        created_at: ts,
      }
      db.participations.push(participation)
      return created({
        message: open ? 'Вы записаны' : 'Заявка на рассмотрении',
        participation: toParticipation(participation),
        event: toEventDetails(event, user),
      })
    }),
  ),

  http.delete(
    url('/events/:id/join'),
    route(({ request, params }) => {
      const user = requireUser(request)
      const event = findEvent(idParam(params, 'id'))
      const current = myParticipation(event.id, user.id)
      if (!current || !isActive(current)) fail(404, 'NOT_FOUND', 'Активной записи нет')
      Object.assign(current!, { status: 'cancelled', decided_at: nowIso() })
      return toParticipation(current!)
    }),
  ),

  http.get(
    url('/events/:id/my-participation'),
    route(({ request, params }) => {
      const user = requireUser(request)
      const p = myParticipation(idParam(params, 'id'), user.id)
      return p ? toParticipation(p) : null
    }),
  ),

  http.get(
    url('/events/:id/participants'),
    route(({ request, params }) => {
      const event = findEvent(idParam(params, 'id'))
      const viewer = currentUser(request)
      const withEmail = isOrganizer(event, viewer) || viewer?.role === 'admin'
      const participants = db.participations
        .filter((p) => p.event_id === event.id && p.status === 'confirmed')
        .map((p) => toParticipant(p, withEmail))
      return { count: participants.length, capacity: event.capacity, participants }
    }),
  ),

  http.get(
    url('/events/:id/requests'),
    route(({ request, params }) => {
      const user = requireUser(request)
      const event = findEvent(idParam(params, 'id'))
      requireOrganizer(event, user)
      const status = search(request).get('status') ?? 'pending'
      return db.participations
        .filter((p) => p.event_id === event.id && p.status === status)
        .map((p) => toParticipant(p, true))
    }),
  ),

  http.post(
    url('/participations/:pid/:action'),
    route(async ({ request, params }) => {
      const user = requireUser(request)
      const action = String(params.action)
      if (action !== 'approve' && action !== 'reject') return fail(404, 'NOT_FOUND', 'Не найдено')
      const p = participationOr404(idParam(params, 'pid'))
      const event = findEvent(p.event_id)
      requireOrganizer(event, user)
      if (p.status !== 'pending') fail(409, 'ALREADY_DECIDED', 'Заявка уже рассмотрена')
      if (event.status !== 'published') unavailable(event)
      if (isPast(event)) fail(409, 'EVENT_PAST', 'Мероприятие уже прошло')
      if (action === 'approve' && event.capacity && confirmedCount(event.id) >= event.capacity)
        fail(409, 'NO_PLACES', 'Мест больше нет')
      const { reason } =
        action === 'reject' ? await readJson<{ reason: string }>(request) : { reason: undefined }
      Object.assign(p, {
        status: action === 'approve' ? 'confirmed' : 'rejected',
        decision_reason: reason?.trim() || null,
        decided_at: nowIso(),
      })
      return toParticipation(p)
    }),
  ),

  // ── Comments
  http.get(
    url('/events/:id/comments'),
    route(({ request, params }) => {
      const event = visibleEvent(idParam(params, 'id'), currentUser(request))
      if (event.status === 'deleted') unavailable(event)
      const items = db.comments
        .filter((c) => c.event_id === event.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id)
        .map((c) => toComment(c))
      return pageOf(items, search(request))
    }),
  ),

  http.post(
    url('/events/:id/comments'),
    route(async ({ request, params }) => {
      const user = requireUser(request)
      const event = publishedEvent(idParam(params, 'id'))
      const input = await readJson<CommentInput>(request)
      const text = input.text?.trim()
      if (!text) validation({ text: 'не должно быть пустым' })
      if (
        input.parent_id &&
        !db.comments.some((c) => c.id === input.parent_id && c.event_id === event.id)
      )
        validation({ parent_id: 'Сообщение, на которое вы отвечаете, не найдено' })
      if (input.as_organization_id) {
        const org = findOrg(input.as_organization_id)
        if (!org || org.owner_id !== user.id || org.status !== 'approved')
          fail(403, 'FORBIDDEN', 'Писать от имени этой организации нельзя')
      }
      const ts = nowIso()
      const comment = {
        id: newId(),
        event_id: event.id,
        author_id: user.id,
        as_organization_id: input.as_organization_id ?? null,
        parent_id: input.parent_id ?? null,
        text: text!,
        is_hidden: false,
        hidden_reason: null,
        created_at: ts,
        updated_at: ts,
      }
      db.comments.push(comment)
      return created(toComment(comment))
    }),
  ),

  http.patch(
    url('/comments/:cid'),
    route(async ({ request, params }) => {
      const user = requireUser(request)
      const comment =
        db.comments.find((c) => c.id === idParam(params, 'cid')) ??
        fail(404, 'NOT_FOUND', 'Сообщение не найдено')
      if (comment.author_id !== user.id)
        fail(403, 'FORBIDDEN', 'Можно править только свои сообщения')
      if (comment.is_hidden) fail(409, 'COMMENT_HIDDEN', 'Сообщение скрыто модератором')
      const { text } = await readJson<{ text: string }>(request)
      if (!text?.trim()) validation({ text: 'не должно быть пустым' })
      Object.assign(comment, {
        text: text!.trim(),
        updated_at: new Date(Date.now() + 1).toISOString(),
      })
      return toComment(comment)
    }),
  ),

  http.delete(
    url('/comments/:cid'),
    route(({ request, params }) => {
      const user = requireUser(request)
      const comment =
        db.comments.find((c) => c.id === idParam(params, 'cid')) ??
        fail(404, 'NOT_FOUND', 'Сообщение не найдено')
      if (comment.author_id !== user.id)
        fail(403, 'FORBIDDEN', 'Можно удалить только свои сообщения')
      db.comments = db.comments.filter((c) => c.id !== comment.id && c.parent_id !== comment.id)
      return noContent()
    }),
  ),

  // ── Organizations
  http.post(
    url('/organizations'),
    route(async ({ request }) => {
      const user = requireUser(request)
      const input = await readJson<OrganizationInput>(request)
      const fields: Record<string, string> = {}
      if (!input.name?.trim()) fields.name = 'не должно быть пустым'
      if (!input.type) fields.type = 'не должно равняться null'
      if (!input.contacts?.trim()) fields.contacts = 'не должно быть пустым'
      if (Object.keys(fields).length) validation(fields)
      const ts = nowIso()
      const org: OrganizationRow = {
        id: newId(),
        owner_id: user.id,
        name: input.name!.trim(),
        description: input.description?.trim() || null,
        type: input.type!,
        sports_description: input.sports_description?.trim() || null,
        city: input.city?.trim() || null,
        website_url: input.website_url?.trim() || null,
        avatar_url: input.avatar_url?.trim() || null,
        contacts: input.contacts!.trim(),
        status: 'pending',
        reject_reason: null,
        decided_at: null,
        created_at: ts,
        updated_at: ts,
      }
      db.organizations.push(org)
      return created(toOrganization(org))
    }),
  ),

  http.get(
    url('/organizations/my'),
    route(({ request }) => ownedOrgs(requireUser(request).id).map(toOrganization)),
  ),

  http.get(
    url('/organizations'),
    route(({ request }) => {
      const sp = search(request)
      const q = normalizeName(sp.get('q') ?? '')
      const sport = normalizeName(sp.get('sport') ?? '')
      const city = normalizeName(sp.get('city') ?? '')
      const items = db.organizations
        .filter((o) => o.status === 'approved')
        .filter((o) => !q || normalizeName(`${o.name} ${o.description ?? ''}`).includes(q))
        .filter((o) => !sport || normalizeName(o.sports_description ?? '').includes(sport))
        .filter((o) => !city || normalizeName(o.city ?? '').includes(city))
        .map(toOrganization)
      return pageOf(items, sp)
    }),
  ),

  http.get(
    url('/organizations/:id'),
    route(({ request, params }) => {
      const org = findOrg(idParam(params, 'id'))
      const viewer = currentUser(request)
      if (
        !org ||
        (org.status !== 'approved' && org.owner_id !== viewer?.id && viewer?.role !== 'admin')
      )
        fail(404, 'NOT_FOUND', 'Организация не найдена')
      return toOrganization(org!)
    }),
  ),

  http.patch(
    url('/organizations/:id'),
    route(async ({ request, params }) => {
      const user = requireUser(request)
      const org = findOrgOr404(idParam(params, 'id'))
      if (org.owner_id !== user.id) fail(403, 'FORBIDDEN', 'Править может только владелец')
      const input = await readJson<OrganizationInput>(request)
      Object.assign(org, input, { updated_at: nowIso() })
      return toOrganization(org)
    }),
  ),

  http.post(
    url('/organizations/:id/resubmit'),
    route(({ request, params }) => {
      const user = requireUser(request)
      const org = findOrgOr404(idParam(params, 'id'))
      if (org.owner_id !== user.id) fail(403, 'FORBIDDEN', 'Подать заявку может только владелец')
      if (org.status !== 'rejected')
        fail(409, 'INVALID_STATUS', 'Повторно подать можно только отклонённую заявку')
      Object.assign(org, {
        status: 'pending',
        reject_reason: null,
        decided_at: null,
        updated_at: nowIso(),
      })
      return toOrganization(org)
    }),
  ),

  http.get(
    url('/organizations/:id/events'),
    route(({ params }) => {
      const org = findOrg(idParam(params, 'id'))
      if (!org || org.status !== 'approved') fail(404, 'NOT_FOUND', 'Организация не найдена')
      return db.events
        .filter((e) => e.organizer_org_id === org!.id && e.status === 'published' && !isPast(e))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        .map(toEventSummary)
    }),
  ),

  // ── Admin
  http.get(
    url('/admin/dashboard'),
    route(({ request }) => {
      requireAdmin(request)
      const orgs = (s: OrganizationStatus) => db.organizations.filter((o) => o.status === s).length
      const events = (s: EventStatus) => db.events.filter((e) => e.status === s).length
      return {
        pending_organizations: orgs('pending'),
        approved_organizations: orgs('approved'),
        published_events: events('published'),
        unpublished_events: events('unpublished'),
        deleted_events: events('deleted'),
        cancelled_events: events('cancelled'),
        hidden_comments: db.comments.filter((c) => c.is_hidden).length,
        users: db.users.length,
      }
    }),
  ),

  http.get(
    url('/admin/organizations'),
    route(({ request }) => {
      requireAdmin(request)
      const sp = search(request)
      const status = sp.get('status')
      const q = normalizeName(sp.get('q') ?? '')
      const items = db.organizations
        .filter((o) => !status || o.status === status)
        .filter((o) => !q || normalizeName(o.name).includes(q))
        .map(toOrganization)
      return pageOf(items, sp)
    }),
  ),

  http.get(
    url('/admin/organizations/:id'),
    route(({ request, params }) => {
      requireAdmin(request)
      const org = findOrgOr404(idParam(params, 'id'))
      return {
        organization: toOrganization(org),
        owner: toUser(findUser(org.owner_id)!),
        events: db.events.filter((e) => e.organizer_org_id === org.id).map(toEventSummary),
      }
    }),
  ),

  http.post(
    url('/admin/organizations/:id/:action'),
    route(async ({ request, params }) => {
      const admin = requireAdmin(request)
      const action = String(params.action)
      if (action !== 'approve' && action !== 'reject') return fail(404, 'NOT_FOUND', 'Не найдено')
      const org = findOrgOr404(idParam(params, 'id'))
      if (org.status !== 'pending') fail(409, 'ALREADY_DECIDED', 'Заявка уже рассмотрена')
      if (action === 'reject') {
        const { reason } = await readJson<{ reason: string }>(request)
        if (!reason?.trim()) validation({ reason: 'не должно быть пустым' })
        Object.assign(org, { status: 'rejected', reject_reason: reason!.trim() })
        log(admin, 'org_rejected', 'organization', org.id, reason!.trim())
      } else {
        Object.assign(org, { status: 'approved', reject_reason: null })
        log(admin, 'org_approved', 'organization', org.id, null)
      }
      Object.assign(org, { decided_at: nowIso(), updated_at: nowIso() })
      return toOrganization(org)
    }),
  ),

  http.get(
    url('/admin/events'),
    route(({ request }) => {
      requireAdmin(request)
      const sp = search(request)
      const status = sp.get('status')
      const q = normalizeName(sp.get('q') ?? '')
      const organizer = numberParam(sp, 'organizer')
      const organization = numberParam(sp, 'organization')
      const items = db.events
        .filter((e) => !status || e.status === status)
        .filter((e) => !q || normalizeName(e.title).includes(q))
        .filter((e) => !organizer || e.organizer_user_id === organizer)
        .filter((e) => !organization || e.organizer_org_id === organization)
        .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
        .map(toEventSummary)
      return pageOf(items, sp)
    }),
  ),

  http.get(
    url('/admin/events/:id'),
    route(({ request, params }) => {
      const admin = requireAdmin(request)
      const event = findEvent(idParam(params, 'id'))
      const entry = db.moderation.find((m) => m.target_type === 'event' && m.target_id === event.id)
      const by = entry ? findUser(entry.admin_id) : undefined
      return {
        event: toEventDetails(event, admin),
        moderated_by: by ? toUserShort(by) : null,
        moderated_at: entry?.created_at ?? null,
        participations: db.participations
          .filter((p) => p.event_id === event.id)
          .map((p) => toParticipant(p, true)),
        comments: db.comments
          .filter((c) => c.event_id === event.id)
          .map((c) => toComment(c, { reveal: true })),
      }
    }),
  ),

  http.post(
    url('/admin/events/:id/unpublish'),
    route(async ({ request, params }) => {
      const admin = requireAdmin(request)
      const event = findEvent(idParam(params, 'id'))
      const { reason } = await readJson<{ reason: string }>(request)
      if (!reason?.trim()) validation({ reason: 'не должно быть пустым' })
      if (event.status !== 'published')
        fail(409, 'INVALID_STATUS', 'Мероприятие уже не опубликовано')
      Object.assign(event, {
        status: 'unpublished',
        moderation_reason: reason!.trim(),
        updated_at: nowIso(),
      })
      log(admin, 'event_unpublished', 'event', event.id, reason!.trim())
      return toEventDetails(event, admin)
    }),
  ),

  http.delete(
    url('/admin/events/:id'),
    route(async ({ request, params }) => {
      const admin = requireAdmin(request)
      const event = findEvent(idParam(params, 'id'))
      const { reason } = await readJson<{ reason: string }>(request)
      if (!reason?.trim()) validation({ reason: 'не должно быть пустым' })
      Object.assign(event, {
        status: 'deleted',
        moderation_reason: reason!.trim(),
        updated_at: nowIso(),
      })
      log(admin, 'event_deleted', 'event', event.id, reason!.trim())
      return toEventDetails(event, admin)
    }),
  ),

  http.post(
    url('/admin/events/:id/restore'),
    route(({ request, params }) => {
      const admin = requireAdmin(request)
      const event = findEvent(idParam(params, 'id'))
      if (event.status !== 'unpublished')
        fail(409, 'INVALID_STATUS', 'Восстановить можно только снятое с публикации')
      Object.assign(event, { status: 'published', moderation_reason: null, updated_at: nowIso() })
      log(admin, 'event_restored', 'event', event.id, null)
      return toEventDetails(event, admin)
    }),
  ),

  http.post(
    url('/admin/comments/:cid/hide'),
    route(async ({ request, params }) => {
      const admin = requireAdmin(request)
      const comment =
        db.comments.find((c) => c.id === idParam(params, 'cid')) ??
        fail(404, 'NOT_FOUND', 'Сообщение не найдено')
      const { reason } = await readJson<{ reason: string }>(request)
      if (!reason?.trim()) validation({ reason: 'не должно быть пустым' })
      Object.assign(comment, { is_hidden: true, hidden_reason: reason!.trim() })
      log(admin, 'comment_hidden', 'comment', comment.id, reason!.trim())
      return toComment(comment, { reveal: true })
    }),
  ),

  http.get(
    url('/admin/audit-log'),
    route(({ request }) => {
      requireAdmin(request)
      const sp = search(request)
      const target = sp.get('target_type')
      const items = db.moderation
        .filter((m) => !target || m.target_type === target)
        .map((m) => ({
          id: m.id,
          admin: toUserShort(findUser(m.admin_id)!),
          action: m.action,
          target_type: m.target_type,
          target_id: m.target_id,
          reason: m.reason,
          created_at: m.created_at,
        }))
      return pageOf(items, sp)
    }),
  ),
]
