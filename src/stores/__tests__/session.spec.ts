import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { setupServer } from 'msw/node'
import { getToken, setToken } from '@/api'
import { handlers } from '@/mocks/handlers'
import { resetDb } from '@/mocks/db'
import { useSessionStore } from '../session'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetDb()
  setToken(null)
  setActivePinia(createPinia())
})
afterAll(() => server.close())

describe('session', () => {
  it('входит по демо-аккаунту и подтягивает организацию', async () => {
    const session = useSessionStore()
    await session.loginDemo('org_approved')
    expect(session.isAuthenticated).toBe(true)
    expect(session.isAdmin).toBe(false)
    expect(session.hasApprovedOrganization).toBe(true)
    expect(getToken()).toBeTruthy()
  })

  it('распознаёт администратора', async () => {
    const session = useSessionStore()
    await session.loginDemo('admin')
    expect(session.isAdmin).toBe(true)
  })

  it('при неверном пароле не оставляет токен', async () => {
    const session = useSessionStore()
    await expect(session.loginWithEmail('anna@example.ru', 'нет')).rejects.toMatchObject({
      status: 401,
    })
    expect(session.isAuthenticated).toBe(false)
    expect(getToken()).toBeNull()
  })

  it('выход очищает пользователя и токен', async () => {
    const session = useSessionStore()
    await session.loginDemo('user')
    await session.logout()
    expect(session.user).toBeNull()
    expect(getToken()).toBeNull()
  })
})
