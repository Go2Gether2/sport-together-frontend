import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

describe('HomeView', () => {
  it('показывает заголовок и ведёт к мероприятиям', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: HomeView },
        { path: '/events', name: 'events', component: { template: '<div />' } },
      ],
    })
    const wrapper = mount(HomeView, { global: { plugins: [router] } })
    expect(wrapper.get('h1').text()).toBe('Найдите компанию для спорта')
    expect(wrapper.get('a').attributes('href')).toBe('/events')
  })
})
