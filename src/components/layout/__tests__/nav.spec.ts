import { describe, expect, it } from 'vitest'
import { desktopItems, menuItems, tabBarItems } from '../nav'

const labels = (items: { label: string }[]) => items.map((i) => i.label)

describe('навигация', () => {
  it('админка видна только администратору', () => {
    expect(labels(desktopItems(false))).not.toContain('Админка')
    expect(labels(desktopItems(true))).toContain('Админка')
    expect(labels(menuItems(false))).not.toContain('Админка')
    expect(labels(menuItems(true))).toContain('Админка')
  })

  it('нижняя панель — по два раздела слева и справа от «Создать»', () => {
    const [left, right] = tabBarItems()
    expect(labels(left)).toEqual(['Главная', 'Мероприятия'])
    expect(labels(right)).toEqual(['Мои записи', 'Профиль'])
  })
})
