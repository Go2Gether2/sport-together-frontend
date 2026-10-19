import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HomeView from '@/views/HomeView.vue'

describe('HomeView', () => {
  it('показывает заголовок', () => {
    const wrapper = mount(HomeView)
    expect(wrapper.get('h1').text()).toBe('Найдите компанию для спорта')
  })
})
