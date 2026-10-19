import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { setToken } from '@/api'
import { handlers } from '@/mocks/handlers'
import { resetDb } from '@/mocks/db'
import EventsView from '../EventsView.vue'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetDb()
  setToken(null)
  setActivePinia(createPinia())
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

async function setup(path = '/events') {
  const Stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/events', name: 'events', component: EventsView },
      { path: '/events/new', name: 'event-create', component: Stub },
      { path: '/events/:id', name: 'event', component: Stub },
    ],
  })
  await router.push(path)
  const wrapper = mount(EventsView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

const titles = (wrapper: Awaited<ReturnType<typeof setup>>['wrapper']) =>
  wrapper.findAll('article h3').map((h) => h.text())

describe('EventsView', () => {
  it('показывает опубликованные будущие мероприятия без снятых', async () => {
    const { wrapper } = await setup()
    expect(titles(wrapper)).toContain('Дворовый футбол 5×5')
    expect(titles(wrapper)).not.toContain('Велопрогулка вдоль Енисея')
    expect(wrapper.text()).toContain('Найдено 9 мероприятий')
  })

  it('фильтр по режиму записи попадает в адрес и сужает список', async () => {
    const { wrapper, router } = await setup()
    const chip = wrapper.findAll('button').find((b) => b.text() === 'По заявке')!
    await chip.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ join_mode: 'approval' })
    expect(titles(wrapper).sort()).toEqual(
      ['Дворовый футбол 5×5', 'Интервальная тренировка на стадионе', 'Пляжный волейбол'].sort(),
    )
  })

  it('читает фильтры из ссылки и показывает пустое состояние со сбросом', async () => {
    const { wrapper, router } = await setup('/events?q=керлинг')
    expect(wrapper.text()).toContain('Пока никто не собирается')
    const reset = wrapper.findAll('button').find((b) => b.text() === 'Сбросить фильтры')!
    await reset.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({})
    expect(titles(wrapper).length).toBe(9)
  })

  it('переключается на карту, сохраняя фильтры в адресе', async () => {
    const { wrapper, router } = await setup('/events?join_mode=open')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Картой')!
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ join_mode: 'open', view: 'map' })
    // В тестах ключа 2ГИС нет — карта честно говорит, что не подключена, список остаётся.
    expect(wrapper.text()).toContain('Карта не подключена')
    expect(wrapper.findAll('article h3').length).toBeGreaterThan(0)
  })

  it('при ошибке сервера даёт повторить', async () => {
    server.use(http.get('*/api/v1/events', () => HttpResponse.json({}, { status: 500 })))
    const { wrapper } = await setup()
    expect(wrapper.get('[role="alert"]').text()).toContain('Не получилось загрузить мероприятия')
    server.resetHandlers()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Повторить')!
      .trigger('click')
    await flushPromises()
    expect(titles(wrapper).length).toBe(9)
  })
})
