import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import {
  adminApi,
  ApiError,
  authApi,
  commentsApi,
  eventsApi,
  organizationsApi,
  participationsApi,
  setToken,
  sportsApi,
} from '@/api'
import type { EventInput } from '@/api'
import { handlers } from '../handlers'
import { resetDb } from '../db'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetDb()
  setToken(null)
})
afterAll(() => server.close())

async function loginAs(demo: string) {
  const { token } = await authApi.login({ demo_account_id: demo })
  setToken(token)
}

const fail = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (e: unknown) => e as ApiError,
  )

const tomorrow = () => new Date(Date.now() + 24 * 3600 * 1000).toISOString()

const eventInput = (extra: Partial<EventInput> = {}): EventInput => ({
  title: 'Скандинавская ходьба в парке',
  description: 'Палки дадим',
  sport_name: 'Скандинавская ходьба',
  starts_at: tomorrow(),
  address: 'Красноярск, парк Гагарина',
  join_mode: 'open',
  ...extra,
})

describe('С1: создание мероприятия пользователем', () => {
  it('создаёт событие с новым направлением, другой пользователь его находит', async () => {
    await loginAs('user')
    const { id } = await eventsApi.create(eventInput())

    await loginAs('user2')
    const feed = await eventsApi.list({ q: 'скандинавская' })
    expect(feed.items.map((e) => e.id)).toContain(id)
    const event = await eventsApi.get(id)
    expect(event.sport).toMatchObject({ name: 'Скандинавская ходьба', is_custom: true })
    expect(event.organizer).toMatchObject({ type: 'user', user: { name: 'Анна Смирнова' } })
  })

  it('не плодит дубли направления при другом написании', async () => {
    await loginAs('user')
    await eventsApi.create(eventInput())
    await eventsApi.create(eventInput({ sport_name: '  скандинавская  ХОДЬБА ' }))
    const sports = await sportsApi.list('скандинав')
    expect(sports).toHaveLength(1)
  })

  it('возвращает ошибки по полям', async () => {
    await loginAs('user')
    const error = await fail(
      eventsApi.create(eventInput({ title: '', starts_at: '2000-01-01T00:00:00Z' })),
    )
    expect(error?.status).toBe(422)
    expect(error?.fields).toMatchObject({
      title: expect.any(String),
      starts_at: expect.any(String),
    })
  })
})

describe('С2: допуск организации', () => {
  it('до допуска публиковать нельзя, после одобрения событие видно на странице организации', async () => {
    await loginAs('org_pending')
    const org = (await organizationsApi.my())!
    expect(org.status).toBe('pending')
    const denied = await fail(eventsApi.create(eventInput({ organization_id: org.id })))
    expect(denied?.status).toBe(403)

    await loginAs('user')
    expect((await fail(organizationsApi.get(org.id)))?.status).toBe(404)

    await loginAs('admin')
    await adminApi.approveOrganization(org.id)

    await loginAs('org_pending')
    const { id } = await eventsApi.create(
      eventInput({ organization_id: org.id, sport_id: 's-chess', sport_name: undefined }),
    )

    await loginAs('user')
    expect((await organizationsApi.get(org.id)).status).toBe('approved')
    const events = await organizationsApi.events(org.id)
    expect(events.map((e) => e.id)).toContain(id)
  })

  it('отклонение требует причину, организация её видит и может подать снова', async () => {
    await loginAs('org_pending')
    const org = (await organizationsApi.my())!

    await loginAs('admin')
    expect((await fail(adminApi.rejectOrganization(org.id, ' ')))?.status).toBe(422)
    await adminApi.rejectOrganization(org.id, 'Добавьте контакты')

    await loginAs('org_pending')
    expect(await organizationsApi.my()).toMatchObject({
      status: 'rejected',
      reject_reason: 'Добавьте контакты',
    })
    expect((await organizationsApi.resubmit(org.id)).status).toBe('pending')
  })
})

describe('С3: свободная запись', () => {
  it('пользователь сразу участник, организатор видит его в составе', async () => {
    await loginAs('user2')
    const p = await eventsApi.join('e-yoga')
    expect(p.status).toBe('confirmed')
    expect((await eventsApi.get('e-yoga')).my_participation?.status).toBe('confirmed')

    await loginAs('user')
    const participants = await eventsApi.participants('e-yoga')
    expect(participants.map((u) => u.name)).toContain('Пётр Иванов')
  })

  it('не даёт записаться дважды и на своё событие', async () => {
    await loginAs('user2')
    await eventsApi.join('e-yoga')
    expect((await fail(eventsApi.join('e-yoga')))?.status).toBe(409)

    await loginAs('user')
    expect((await fail(eventsApi.join('e-yoga')))?.code).toBe('own_event')
  })
})

describe('С4: запись по заявке', () => {
  it('заявка ждёт, организатор принимает — статус обновляется у обеих сторон', async () => {
    await loginAs('user')
    const pending = await eventsApi.requests('e-football')
    const petr = pending.find((p) => p.user.name === 'Пётр Иванов')!
    await participationsApi.approve(petr.id)
    expect((await eventsApi.participants('e-football')).map((u) => u.name)).toContain('Пётр Иванов')

    await loginAs('user2')
    expect((await eventsApi.get('e-football')).my_participation?.status).toBe('confirmed')
  })

  it('отклонение с причиной видно пользователю, повторная заявка возможна', async () => {
    await loginAs('user2')
    await eventsApi.join('e-run-interval', 'Хочу попробовать')

    await loginAs('org_approved')
    const req = (await eventsApi.requests('e-run-interval')).find(
      (p) => p.user.name === 'Пётр Иванов',
    )!
    await participationsApi.reject(req.id, 'Пока рано, приходите на утреннюю пробежку')
    expect((await fail(participationsApi.approve(req.id)))?.code).toBe('already_decided')

    await loginAs('user2')
    const mine = (await eventsApi.get('e-run-interval')).my_participation
    expect(mine).toMatchObject({
      status: 'rejected',
      decision_reason: 'Пока рано, приходите на утреннюю пробежку',
    })
    expect((await eventsApi.join('e-run-interval')).status).toBe('pending')
  })

  it('принять заявку может только организатор, не админ', async () => {
    await loginAs('admin')
    expect((await fail(participationsApi.approve('p-4')))?.status).toBe(403)
  })
})

describe('С5: обсуждение', () => {
  it('вопрос и ответ организатора различимы по авторству', async () => {
    await loginAs('user2')
    await commentsApi.create('e-yoga', { text: 'Коврик обязателен?' })
    await loginAs('user')
    await commentsApi.create('e-yoga', { text: 'Можно плед' })

    const { items } = await commentsApi.list('e-yoga')
    expect(items.map((c) => [c.author.name, c.is_organizer])).toEqual([
      ['Пётр Иванов', false],
      ['Анна Смирнова', true],
    ])
  })

  it('скрытое сообщение приходит без текста, остальное обсуждение на месте', async () => {
    await loginAs('admin')
    await adminApi.hideComment('c-1', 'Не по теме')
    setToken(null)
    const { items } = await commentsApi.list('e-football')
    expect(items.find((c) => c.id === 'c-1')).toMatchObject({ is_hidden: true, text: '' })
    expect(items.find((c) => c.id === 'c-2')?.text).not.toBe('')
  })
})

describe('С6: снятие с публикации', () => {
  it('событие пропадает из ленты, по прямой ссылке — 410 с причиной, записаться нельзя', async () => {
    await loginAs('admin')
    await adminApi.unpublishEvent('e-yoga', 'Неверное место')

    await loginAs('user2')
    const feed = await eventsApi.list()
    expect(feed.items.map((e) => e.id)).not.toContain('e-yoga')
    const gone = await fail(eventsApi.get('e-yoga'))
    expect(gone?.isGone).toBe(true)
    expect(gone?.message).toContain('Неверное место')
    expect((await fail(eventsApi.join('e-yoga')))?.status).toBe(410)
  })

  it('админ видит снятое событие в своём разделе и не может его удалить без причины', async () => {
    await loginAs('admin')
    const unpublished = await adminApi.events({ status: 'unpublished' })
    expect(unpublished.map((e) => e.id)).toContain('e-cycling')
    expect((await fail(adminApi.deleteEvent('e-yoga', '')))?.status).toBe(422)
  })
})
