import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import HomeView from '../HomeView.vue'

beforeEach(() => setActivePinia(createPinia()))

describe('HomeView', () => {
  it('плитки видов спорта ведут в ленту с поиском по виду', async () => {
    const Stub = { template: '<div />' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: HomeView },
        { path: '/events', name: 'events', component: Stub },
      ],
    })
    await router.push('/')
    const wrapper = mount(HomeView, {
      global: {
        plugins: [router],
        stubs: { StoriesRow: true, HomeCarousel: true, ForYou: true },
      },
    })
    const links = wrapper
      .findAll('ul a')
      .map((a) => [a.text(), decodeURIComponent(a.attributes('href')!)])
    expect(links).toEqual([
      ['Футбол', '/events?q=футбол'],
      ['Теннис', '/events?q=теннис'],
      ['Бег', '/events?q=бег'],
      ['Шахматы', '/events?q=шахмат'],
    ])
  })
})
