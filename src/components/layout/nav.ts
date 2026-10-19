import type { RouteLocationRaw } from 'vue-router'

export type NavIconName = 'home' | 'list' | 'calendar' | 'user' | 'building' | 'shield' | 'doc'

export interface NavItem {
  label: string
  to: RouteLocationRaw
  icon: NavIconName
}

export const CREATE_ITEM = { label: 'Создать', to: { name: 'event-create' } } as const

const HOME: NavItem = { label: 'Главная', to: { name: 'home' }, icon: 'home' }
const EVENTS: NavItem = { label: 'Мероприятия', to: { name: 'events' }, icon: 'list' }
const MINE: NavItem = { label: 'Мои записи', to: { name: 'my-participations' }, icon: 'calendar' }
const PROFILE: NavItem = { label: 'Профиль', to: { name: 'profile' }, icon: 'user' }
const MY_EVENTS: NavItem = { label: 'Мои мероприятия', to: { name: 'my-events' }, icon: 'calendar' }
const ORGS: NavItem = { label: 'Организации', to: { name: 'organizations' }, icon: 'building' }
const ADMIN: NavItem = { label: 'Админка', to: { name: 'admin' }, icon: 'shield' }
const PRIVACY: NavItem = { label: 'Политика данных', to: { name: 'privacy' }, icon: 'doc' }

/** Нижняя панель на телефоне: «Создать» стоит посередине отдельной кнопкой. */
export function tabBarItems(): [NavItem[], NavItem[]] {
  return [
    [HOME, EVENTS],
    [MINE, PROFILE],
  ]
}

/** Разделы, не вошедшие в нижнюю панель. */
export function menuItems(isAdmin: boolean): NavItem[] {
  return isAdmin ? [ORGS, ADMIN, PRIVACY] : [MY_EVENTS, ORGS, PRIVACY]
}

/** Верхняя навигация на компьютере. */
export function desktopItems(isAdmin: boolean): NavItem[] {
  const items = [HOME, EVENTS, ORGS, MINE, PROFILE]
  return isAdmin ? [...items, ADMIN] : items
}
