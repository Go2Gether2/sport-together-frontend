import { http, HttpResponse, delay, type DefaultBodyType, type PathParams } from 'msw'
import type {
  CommentInput,
  DemoAccount,
  EventFilters,
  EventInput,
  EventStatus,
  Me,
  OrganizationInput,
  OrganizationStatus,
  ParticipationStatus,
} from '@/api/types'
import { API_BASE } from '@/api/http'
import { db, newId, normalizeName, type EventRow, type UserRow } from './db'
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
  ownedOrg,
  paginate,
  requireAdmin,
  requireUser,
  toComment,
  toEventDetails,
  toEventSummary,
  toParticipation,
  toSport,
  toUser,
  toUserShort,
  unavailable,
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

async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return ((await request.json()) ?? {}) as Partial<T>
  } catch {
    return {}
  }
}

const param = (params: PathParams, key: string) => String(params[key])
const nowIso = () => new Date().toISOString()

function search(request: Request) {
  return new URL(request.url).searchParams
}

const DEMO_TITLES: Record<string, Pick<DemoAccount, 'title' | 'description'>> = {
  user: { title: 'Пользователь', description: 'Анна: ищет компанию и организует свои встречи' },
  user2: { title: 'Второй пользователь', description: 'Пётр: записывается на чужие события' },
  org_pending: { title: 'Организация на рассмотрении', description: 'Шахматный клуб ждёт допуска' },
  org_approved: {
    title: 'Допущенная организация',
    description: 'Беговой клуб публикует тренировки',
  },
  admin: { title: 'Администратор', description: 'Допуск организаций и модерация' },
}

function login(user: UserRow) {
  const token = newId()
  db.sessions.set(token, user.id)
  return { token, user: toUser(user) }
}

function me(user: UserRow): Me {
  return { user: toUser(user), organization: ownedOrg(user.id) ?? null }
}

function resolveSport(input: Partial<EventInput>, user: UserRow) {
  if (input.sport_id) {
    return (
      db.sports.find((s) => s.id === input.sport_id) ??
      fail(422, 'validation', 'Проверьте поля.', { sport_id: 'Такого направления нет' })
    )
  }
  const name = input.sport_name?.trim()
  if (!name)
    return fail(422, 'validation', 'Проверьте поля.', {
      sport_id: 'Выберите направление или впишите своё',
    })
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
  if (!input.title?.trim()) fields.title = 'Укажите название'
  if (!input.address?.trim()) fields.address = 'Укажите место'
  if (!input.starts_at || Number.isNaN(Date.parse(input.starts_at)))
    fields.starts_at = 'Укажите дату и время'
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
  if (Object.keys(fields).length) fail(422, 'validation', 'Проверьте заполнение полей.', fields)
}

function publishedEvent(id: string) {
  const event = findEvent(id)
  if (event.status !== 'published') unavailable(event)
  return event
}

function requireOrganizer(event: EventRow, user: UserRow) {
  if (!isOrganizer(event, user))
    fail(403, 'forbidden', 'Это может сделать только организатор мероприятия.')
}

function adminEvents(status?: string | null) {
  return status ? db.events.filter((e) => e.status === status) : db.events
}

export const handlers = [
  // ── Auth
  http.get(
    url('/auth/demo-accounts'),
    route(() =>
      db.users
        .filter((u) => u.demo_key)
        .map((u): DemoAccount => ({ id: u.demo_key!, ...DEMO_TITLES[u.demo_key!]! })),
    ),
  ),

  http.post(
    url('/auth/login'),
    route(async ({ request }) => {
      const body = await readJson<{ email: string; password: string; demo_account_id: string }>(
        request,
      )
      const user = body.demo_account_id
        ? db.users.find((u) => u.demo_key === body.demo_account_id)
        : db.users.find(
            (u) => u.email === body.email?.trim().toLowerCase() && u.password === body.password,
          )
      if (!user) fail(401, 'invalid_credentials', 'Неверный email или пароль.')
      return login(user!)
    }),
  ),

  http.post(
    url('/auth/register'),
    route(async ({ request }) => {
      const body = await readJson<{ name: string; email: string; password: string }>(request)
      const fields: Record<string, string> = {}
      const email = body.email?.trim().toLowerCase() ?? ''
      if (!body.name?.trim()) fields.name = 'Укажите имя'
      if (!/^\S+@\S+\.\S+$/.test(email)) fields.email = 'Укажите корректный email'
      else if (db.users.some((u) => u.email === email))
        fields.email = 'Этот email уже зарегистрирован'
      if (!body.password || body.password.length < 6) fields.password = 'Не короче 6 символов'
      if (Object.keys(fields).length) fail(422, 'validation', 'Проверьте заполнение полей.', fields)
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
        demo_key: null,
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
      return new HttpResponse(null, { status: 204 })
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
      return db.events
        .filter((e) => isOrganizer(e, user) && e.status !== 'deleted')
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        .map((e) => ({
          ...toEventSummary(e),
          pending_requests_count: db.participations.filter(
            (p) => p.event_id === e.id && p.status === 'pending',
          ).length,
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
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((p) => ({ ...toParticipation(p), event: toEventSummary(findEvent(p.event_id)) }))
    }),
  ),

  http.patch(
    url('/users/me'),
    route(async ({ request }) => {
      const user = requireUser(request)
      const body =
        await readJson<Pick<UserRow, 'name' | 'city' | 'bio' | 'sport_ids' | 'level'>>(request)
      if (body.name !== undefined && !body.name.trim())
        fail(422, 'validation', 'Проверьте поля.', { name: 'Укажите имя' })
      Object.assign(user, body)
      return toUser(user)
    }),
  ),

  http.get(
    url('/users/:id'),
    route(({ params }) => {
      const user =
        findUser(param(params, 'id')) ?? fail(404, 'not_found', 'Пользователь не найден.')
      const events = db.events
        .filter(
          (e) =>
            e.organizer_type === 'user' &&
            e.organizer_user_id === user.id &&
            e.status === 'published' &&
            !isPast(e),
        )
        .map(toEventSummary)
      return { ...toUser(user), email: '', events }
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
        db.sports.find((s) => s.id === param(params, 'id')) ??
        fail(404, 'not_found', 'Направление не найдено.')
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
      const f: EventFilters = Object.fromEntries(sp.entries())
      const q = f.q ? normalizeName(f.q) : ''
      const items = db.events
        .filter((e) => e.status === 'published' && !isPast(e))
        .filter((e) => !q || normalizeName(`${e.title} ${e.description}`).includes(q))
        .filter((e) => !f.sport || e.sport_id === f.sport)
        .filter((e) => !f.city || normalizeName(e.address).includes(normalizeName(f.city)))
        .filter((e) => !f.date_from || e.starts_at.slice(0, 10) >= f.date_from)
        .filter((e) => !f.date_to || e.starts_at.slice(0, 10) <= f.date_to)
        .filter((e) => !f.level || e.level === f.level)
        .filter((e) => !f.join_mode || e.join_mode === f.join_mode)
        .filter(
          (e) =>
            !f.organizer ||
            e.organizer_user_id === f.organizer ||
            e.organizer_org_id === f.organizer,
        )
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        .map(toEventSummary)
      return paginate(items, Number(sp.get('page') ?? 1))
    }),
  ),

  http.post(
    url('/events'),
    route(async ({ request }) => {
      const user = requireUser(request)
      if (user.role === 'admin') fail(403, 'forbidden', 'Администратор не создаёт мероприятия.')
      const input = await readJson<EventInput>(request)
      if (input.organization_id) {
        const org = findOrg(input.organization_id)
        if (!org || org.owner_id !== user.id || org.status !== 'approved')
          fail(403, 'organization_not_approved', 'Организация ещё не допущена к публикации.')
      }
      const sport = resolveSport(input, user)
      validateEvent(input)
      const ts = nowIso()
      const event: EventRow = {
        id: newId(),
        title: input.title!.trim(),
        description: input.description?.trim() ?? '',
        sport_id: sport.id,
        organizer_type: input.organization_id ? 'organization' : 'user',
        organizer_user_id: user.id,
        organizer_org_id: input.organization_id ?? null,
        starts_at: input.starts_at!,
        ends_at: input.ends_at ?? null,
        address: input.address!.trim(),
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
      return created({ id: event.id })
    }),
  ),

  http.get(
    url('/events/:id'),
    route(({ request, params }) => {
      const event = publishedEvent(param(params, 'id'))
      return toEventDetails(event, currentUser(request))
    }),
  ),

  http.patch(
    url('/events/:id'),
    route(async ({ request, params }) => {
      const user = requireUser(request)
      const event = publishedEvent(param(params, 'id'))
      requireOrganizer(event, user)
      const input = await readJson<EventInput>(request)
      const merged = { ...event, ...input }
      validateEvent({
        title: merged.title,
        address: merged.address,
        starts_at: merged.starts_at,
        join_mode: merged.join_mode,
        capacity: merged.capacity ?? undefined,
      })
      const sport = input.sport_id || input.sport_name ? resolveSport(input, user) : null
      Object.assign(event, input, { sport_id: sport?.id ?? event.sport_id, updated_at: nowIso() })
      return toEventDetails(event, user)
    }),
  ),

  http.post(
    url('/events/:id/cancel'),
    route(async ({ request, params }) => {
      const user = requireUser(request)
      const event = publishedEvent(param(params, 'id'))
      requireOrganizer(event, user)
      const { reason } = await readJson<{ reason: string }>(request)
      Object.assign(event, {
        status: 'cancelled',
        moderation_reason: reason?.trim() || null,
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
        fail(403, 'forbidden', 'Администратор не записывается на мероприятия.')
      const event = publishedEvent(param(params, 'id'))
      if (isPast(event)) fail(409, 'event_past', 'Мероприятие уже прошло.')
      if (isOrganizer(event, user)) fail(409, 'own_event', 'Нельзя записаться на своё мероприятие.')
      const current = myParticipation(event.id, user.id)
      if (current && isActive(current))
        fail(
          409,
          'already_joined',
          current.status === 'pending' ? 'Заявка уже отправлена.' : 'Вы уже записаны.',
        )
      if (event.capacity && confirmedCount(event.id) >= event.capacity)
        fail(409, 'no_places', 'Мест больше нет.')
      const { message } = await readJson<{ message: string }>(request)
      const ts = nowIso()
      const participation = {
        id: newId(),
        event_id: event.id,
        user_id: user.id,
        status: event.join_mode === 'open' ? ('confirmed' as const) : ('pending' as const),
        message: message?.trim() || null,
        decision_reason: null,
        decided_at: event.join_mode === 'open' ? ts : null,
        created_at: ts,
      }
      db.participations.push(participation)
      return created(toParticipation(participation))
    }),
  ),

  http.delete(
    url('/events/:id/join'),
    route(({ request, params }) => {
      const user = requireUser(request)
      const event = findEvent(param(params, 'id'))
      const current = myParticipation(event.id, user.id)
      if (!current || !isActive(current)) fail(404, 'not_found', 'Активной записи нет.')
      Object.assign(current!, { status: 'cancelled', decided_at: nowIso() })
      return toParticipation(current!)
    }),
  ),

  http.get(
    url('/events/:id/my-participation'),
    route(({ request, params }) => {
      const user = requireUser(request)
      const p = myParticipation(param(params, 'id'), user.id)
      return p ? toParticipation(p) : null
    }),
  ),

  http.get(
    url('/events/:id/participants'),
    route(({ request, params }) => {
      const event = findEvent(param(params, 'id'))
      const viewer = currentUser(request)
      const showContacts = isOrganizer(event, viewer) || viewer?.role === 'admin'
      return db.participations
        .filter((p) => p.event_id === event.id && p.status === 'confirmed')
        .map((p) => {
          const u = findUser(p.user_id)!
          return showContacts ? { ...toUserShort(u), contacts: u.contacts } : toUserShort(u)
        })
    }),
  ),

  http.get(
    url('/events/:id/requests'),
    route(({ request, params }) => {
      const user = requireUser(request)
      const event = findEvent(param(params, 'id'))
      requireOrganizer(event, user)
      const status = search(request).get('status') ?? 'pending'
      return db.participations
        .filter((p) => p.event_id === event.id && p.status === status)
        .map(toParticipation)
    }),
  ),

  http.post(
    url('/participations/:pid/:action'),
    route(async ({ request, params }) => {
      const user = requireUser(request)
      const action = param(params, 'action')
      if (action !== 'approve' && action !== 'reject') return fail(404, 'not_found', 'Не найдено.')
      const p =
        db.participations.find((x) => x.id === param(params, 'pid')) ??
        fail(404, 'not_found', 'Заявка не найдена.')
      const event = findEvent(p.event_id)
      requireOrganizer(event, user)
      if (p.status !== 'pending') fail(409, 'already_decided', 'Заявка уже рассмотрена.')
      if (event.status !== 'published') unavailable(event)
      if (isPast(event)) fail(409, 'event_past', 'Мероприятие уже прошло.')
      if (action === 'approve' && event.capacity && confirmedCount(event.id) >= event.capacity)
        fail(409, 'no_places', 'Мест больше нет.')
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
      const event = findEvent(param(params, 'id'))
      if (event.status === 'deleted') unavailable(event)
      const items = db.comments
        .filter((c) => c.event_id === event.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((c) => toComment(c))
      return paginate(items, Number(search(request).get('page') ?? 1), 50)
    }),
  ),

  http.post(
    url('/events/:id/comments'),
    route(async ({ request, params }) => {
      const user = requireUser(request)
      const event = publishedEvent(param(params, 'id'))
      const input = await readJson<CommentInput>(request)
      const text = input.text?.trim()
      if (!text) fail(422, 'validation', 'Напишите сообщение.', { text: 'Сообщение пустое' })
      if (
        input.parent_id &&
        !db.comments.some((c) => c.id === input.parent_id && c.event_id === event.id)
      )
        fail(422, 'validation', 'Сообщение, на которое вы отвечаете, не найдено.')
      if (input.as_organization_id) {
        const org = findOrg(input.as_organization_id)
        if (!org || org.owner_id !== user.id || org.status !== 'approved')
          fail(403, 'forbidden', 'Писать от имени этой организации нельзя.')
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
        db.comments.find((c) => c.id === param(params, 'cid')) ??
        fail(404, 'not_found', 'Сообщение не найдено.')
      if (comment.author_id !== user.id)
        fail(403, 'forbidden', 'Можно править только свои сообщения.')
      if (comment.is_hidden) fail(409, 'hidden', 'Сообщение скрыто модератором.')
      const { text } = await readJson<{ text: string }>(request)
      if (!text?.trim())
        fail(422, 'validation', 'Напишите сообщение.', { text: 'Сообщение пустое' })
      Object.assign(comment, { text: text!.trim(), updated_at: nowIso() })
      return toComment(comment)
    }),
  ),

  http.delete(
    url('/comments/:cid'),
    route(({ request, params }) => {
      const user = requireUser(request)
      const comment =
        db.comments.find((c) => c.id === param(params, 'cid')) ??
        fail(404, 'not_found', 'Сообщение не найдено.')
      if (comment.author_id !== user.id)
        fail(403, 'forbidden', 'Можно удалить только свои сообщения.')
      db.comments = db.comments.filter((c) => c.id !== comment.id && c.parent_id !== comment.id)
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  // ── Organizations
  http.post(
    url('/organizations'),
    route(async ({ request }) => {
      const user = requireUser(request)
      if (ownedOrg(user.id)) fail(409, 'already_exists', 'У вас уже есть организация.')
      const input = await readJson<OrganizationInput>(request)
      const fields: Record<string, string> = {}
      if (!input.name?.trim()) fields.name = 'Укажите название'
      if (!input.description?.trim()) fields.description = 'Расскажите, чем занимается организация'
      if (!input.type) fields.type = 'Выберите тип'
      if (!input.sport_ids?.length) fields.sport_ids = 'Выберите хотя бы одно направление'
      if (Object.keys(fields).length) fail(422, 'validation', 'Проверьте заполнение полей.', fields)
      const org = {
        id: newId(),
        owner_id: user.id,
        name: input.name!.trim(),
        description: input.description!.trim(),
        type: input.type!,
        sport_ids: input.sport_ids!,
        city: input.city?.trim() || null,
        contacts: input.contacts?.trim() || null,
        status: 'pending' as const,
        reject_reason: null,
        created_at: nowIso(),
      }
      db.organizations.push(org)
      return created(org)
    }),
  ),

  http.get(
    url('/organizations/my'),
    route(({ request }) => ownedOrg(requireUser(request).id) ?? null),
  ),

  http.get(
    url('/organizations'),
    route(({ request }) => {
      const sp = search(request)
      const q = normalizeName(sp.get('q') ?? '')
      const sport = sp.get('sport')
      const city = normalizeName(sp.get('city') ?? '')
      return db.organizations
        .filter((o) => o.status === 'approved')
        .filter((o) => !q || normalizeName(`${o.name} ${o.description}`).includes(q))
        .filter((o) => !sport || o.sport_ids.includes(sport))
        .filter((o) => !city || normalizeName(o.city ?? '').includes(city))
    }),
  ),

  http.get(
    url('/organizations/:id'),
    route(({ request, params }) => {
      const org = findOrg(param(params, 'id'))
      const viewer = currentUser(request)
      if (
        !org ||
        (org.status !== 'approved' && org.owner_id !== viewer?.id && viewer?.role !== 'admin')
      )
        fail(404, 'not_found', 'Страница не найдена или ещё не опубликована.')
      return org
    }),
  ),

  http.patch(
    url('/organizations/:id'),
    route(async ({ request, params }) => {
      const user = requireUser(request)
      const org = findOrg(param(params, 'id')) ?? fail(404, 'not_found', 'Организация не найдена.')
      if (org.owner_id !== user.id) fail(403, 'forbidden', 'Править может только владелец.')
      const input = await readJson<OrganizationInput>(request)
      Object.assign(org, input)
      return org
    }),
  ),

  http.post(
    url('/organizations/:id/resubmit'),
    route(({ request, params }) => {
      const user = requireUser(request)
      const org = findOrg(param(params, 'id')) ?? fail(404, 'not_found', 'Организация не найдена.')
      if (org.owner_id !== user.id) fail(403, 'forbidden', 'Подать заявку может только владелец.')
      if (org.status !== 'rejected')
        fail(409, 'invalid_status', 'Повторно подать можно только отклонённую заявку.')
      Object.assign(org, { status: 'pending', reject_reason: null })
      return org
    }),
  ),

  http.get(
    url('/organizations/:id/events'),
    route(({ params }) => {
      const org = findOrg(param(params, 'id'))
      if (!org || org.status !== 'approved')
        fail(404, 'not_found', 'Страница не найдена или ещё не опубликована.')
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
      return {
        organizations_pending: db.organizations.filter((o) => o.status === 'pending').length,
        events_published: db.events.filter((e) => e.status === 'published' && !isPast(e)).length,
        events_moderated: db.events.filter(
          (e) => e.status === 'unpublished' || e.status === 'deleted',
        ).length,
      }
    }),
  ),

  http.get(
    url('/admin/organizations'),
    route(({ request }) => {
      requireAdmin(request)
      const sp = search(request)
      const status = sp.get('status') as OrganizationStatus | null
      const q = normalizeName(sp.get('q') ?? '')
      return db.organizations
        .filter((o) => !status || o.status === status)
        .filter((o) => !q || normalizeName(o.name).includes(q))
    }),
  ),

  http.get(
    url('/admin/organizations/:id'),
    route(({ request, params }) => {
      requireAdmin(request)
      const org = findOrg(param(params, 'id')) ?? fail(404, 'not_found', 'Организация не найдена.')
      return {
        ...org,
        owner: toUser(findUser(org.owner_id)!),
        events: db.events.filter((e) => e.organizer_org_id === org.id).map(toEventSummary),
      }
    }),
  ),

  http.post(
    url('/admin/organizations/:id/:action'),
    route(async ({ request, params }) => {
      requireAdmin(request)
      const action = param(params, 'action')
      if (action !== 'approve' && action !== 'reject') return fail(404, 'not_found', 'Не найдено.')
      const org = findOrg(param(params, 'id')) ?? fail(404, 'not_found', 'Организация не найдена.')
      if (org.status !== 'pending') fail(409, 'already_decided', 'Заявка уже рассмотрена.')
      if (action === 'reject') {
        const { reason } = await readJson<{ reason: string }>(request)
        if (!reason?.trim())
          fail(422, 'validation', 'Укажите причину отказа.', { reason: 'Причина обязательна' })
        Object.assign(org, { status: 'rejected', reject_reason: reason!.trim() })
      } else {
        Object.assign(org, { status: 'approved', reject_reason: null })
      }
      return org
    }),
  ),

  http.get(
    url('/admin/events'),
    route(({ request }) => {
      requireAdmin(request)
      const sp = search(request)
      const q = normalizeName(sp.get('q') ?? '')
      const organizer = sp.get('organizer')
      return adminEvents(sp.get('status') as EventStatus | null)
        .filter((e) => !q || normalizeName(e.title).includes(q))
        .filter(
          (e) =>
            !organizer || e.organizer_user_id === organizer || e.organizer_org_id === organizer,
        )
        .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
        .map(toEventSummary)
    }),
  ),

  http.get(
    url('/admin/events/:id'),
    route(({ request, params }) => {
      const admin = requireAdmin(request)
      const event = findEvent(param(params, 'id'))
      return {
        ...toEventDetails(event, admin),
        participants: db.participations
          .filter((p) => p.event_id === event.id && p.status === 'confirmed')
          .map((p) => {
            const u = findUser(p.user_id)!
            return { ...toUserShort(u), contacts: u.contacts }
          }),
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
      const event = findEvent(param(params, 'id'))
      const { reason } = await readJson<{ reason: string }>(request)
      if (!reason?.trim())
        fail(422, 'validation', 'Укажите причину.', { reason: 'Причина обязательна' })
      if (event.status !== 'published')
        fail(409, 'invalid_status', 'Мероприятие уже не опубликовано.')
      Object.assign(event, {
        status: 'unpublished',
        moderation_reason: reason!.trim(),
        updated_at: nowIso(),
      })
      return toEventDetails(event, admin)
    }),
  ),

  http.delete(
    url('/admin/events/:id'),
    route(async ({ request, params }) => {
      const admin = requireAdmin(request)
      const event = findEvent(param(params, 'id'))
      const { reason } = await readJson<{ reason: string }>(request)
      if (!reason?.trim())
        fail(422, 'validation', 'Укажите причину.', { reason: 'Причина обязательна' })
      Object.assign(event, {
        status: 'deleted',
        moderation_reason: reason!.trim(),
        updated_at: nowIso(),
      })
      return toEventDetails(event, admin)
    }),
  ),

  http.post(
    url('/admin/events/:id/restore'),
    route(({ request, params }) => {
      const admin = requireAdmin(request)
      const event = findEvent(param(params, 'id'))
      if (event.status !== 'unpublished')
        fail(409, 'invalid_status', 'Восстановить можно только снятое с публикации.')
      Object.assign(event, { status: 'published', moderation_reason: null, updated_at: nowIso() })
      return toEventDetails(event, admin)
    }),
  ),

  http.post(
    url('/admin/comments/:cid/hide'),
    route(async ({ request, params }) => {
      requireAdmin(request)
      const comment =
        db.comments.find((c) => c.id === param(params, 'cid')) ??
        fail(404, 'not_found', 'Сообщение не найдено.')
      const { reason } = await readJson<{ reason: string }>(request)
      if (!reason?.trim())
        fail(422, 'validation', 'Укажите причину.', { reason: 'Причина обязательна' })
      Object.assign(comment, { is_hidden: true, hidden_reason: reason!.trim() })
      return toComment(comment, { reveal: true })
    }),
  ),
]
