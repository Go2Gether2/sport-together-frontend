import { describe, expect, it } from 'vitest'
import { headerItems, menuItems, tabBarItems, userMenuItems } from '../nav'

const labels = (items: { label: string }[]) => items.map((i) => i.label)
const desktop = (isAdmin: boolean) => [
  ...headerItems(isAdmin).map((h) => h.item),
  ...userMenuItems(isAdmin),
]

describe('навигация', () => {
  it('админка видна только администратору', () => {
    expect(labels(desktop(false))).not.toContain('Админка')
    expect(labels(desktop(true))).toContain('Админка')
    expect(labels(menuItems(false))).not.toContain('Админка')
    expect(labels(menuItems(true))).toContain('Админка')
  })

  it('на компьютере доступны все разделы телефона: в шапке или в меню аватара', () => {
    const phone = [...tabBarItems().flat(), ...menuItems(false)].map((i) => i.label)
    for (const label of phone.filter((l) => l !== 'Политика данных')) {
      expect(labels(desktop(false))).toContain(label)
    }
  })

  it('на узкой шапке скрыта только Главная — туда ведёт логотип', () => {
    for (const isAdmin of [false, true]) {
      const hidden = headerItems(isAdmin).filter((h) => h.wide)
      expect(labels(hidden.map((h) => h.item))).toEqual(['Главная'])
    }
  })

  it('нижняя панель — по два раздела слева и справа от «Создать»', () => {
    const [left, right] = tabBarItems()
    expect(labels(left)).toEqual(['Главная', 'Мероприятия'])
    expect(labels(right)).toEqual(['Мои записи', 'Профиль'])
  })
})
