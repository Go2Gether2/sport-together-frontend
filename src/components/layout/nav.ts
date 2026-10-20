import type { RouteLocationRaw } from 'vue-router'
import { t } from '@/i18n'

export type NavIconName =
  'home' | 'list' | 'calendar' | 'user' | 'building' | 'shield' | 'doc' | 'flag'

export interface NavItem {
  label: string
  to: RouteLocationRaw
  icon: NavIconName
}

export const CREATE_ITEM = {
  get label() {
    return t('nav.create')
  },
  to: { name: 'event-create' },
} as const

// Подписи — геттеры: читаются при отрисовке и меняются вместе с языком.
const item = (key: string, name: string, icon: NavIconName): NavItem => ({
  get label() {
    return t(`nav.${key}`)
  },
  to: { name },
  icon,
})

const HOME = item('home', 'home', 'home')
const EVENTS = item('events', 'events', 'list')
const MINE = item('mine', 'my-participations', 'calendar')
const PROFILE = item('profile', 'profile', 'user')
const MY_EVENTS = item('myEvents', 'my-events', 'flag')
const MY_ORG = item('myOrg', 'my-organization', 'building')
const ORGS = item('orgs', 'organizations', 'building')
const ADMIN = item('admin', 'admin', 'shield')
const PRIVACY = item('privacy', 'privacy', 'doc')

/** Нижняя панель на телефоне: «Создать» стоит посередине отдельной кнопкой. */
export function tabBarItems(): [NavItem[], NavItem[]] {
  return [
    [HOME, EVENTS],
    [MINE, PROFILE],
  ]
}

/** Разделы, не вошедшие в нижнюю панель. */
export function menuItems(isAdmin: boolean): NavItem[] {
  return isAdmin ? [ORGS, ADMIN, PRIVACY] : [MY_EVENTS, MY_ORG, ORGS, PRIVACY]
}

/** Боковая панель на компьютере: все разделы сразу, как в нижней панели и меню телефона. */
export function desktopItems(isAdmin: boolean): NavItem[] {
  return isAdmin
    ? [HOME, EVENTS, ORGS, ADMIN, PROFILE]
    : [HOME, EVENTS, MINE, MY_EVENTS, MY_ORG, ORGS, PROFILE]
}
