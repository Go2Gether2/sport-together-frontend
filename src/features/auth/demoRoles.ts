import type { DemoAccount } from '@/api'

export type DemoGroupKey = 'users' | 'organizations' | 'admin'

export interface DemoGroup {
  key: DemoGroupKey
  title: string
  accounts: (DemoAccount & { scenarios: string | null })[]
}

const GROUP_TITLES: Record<DemoGroupKey, string> = {
  users: 'Пользователи',
  organizations: 'Организации',
  admin: 'Администратор',
}

// Почты демо-аккаунтов одинаковы в моках и на бэке; роль организации API не отдаёт, поэтому группу берём отсюда.
const KNOWN: Record<string, { group: DemoGroupKey; scenarios: string }> = {
  'user@demo.local': {
    group: 'users',
    scenarios: 'С1, С4, С5 — создать мероприятие, принять заявку',
  },
  'user2@demo.local': {
    group: 'users',
    scenarios: 'С3, С4, С5 — записаться, задать вопрос',
  },
  'org@demo.local': {
    group: 'organizations',
    scenarios: 'С2 — опубликовать от организации',
  },
  'org2@demo.local': {
    group: 'organizations',
    scenarios: 'С2 — заявка на допуске, публиковать нельзя',
  },
  'admin@demo.local': {
    group: 'admin',
    scenarios: 'С2, С6 — допуск и модерация',
  },
}

export function groupDemoAccounts(accounts: DemoAccount[]): DemoGroup[] {
  const groups: DemoGroup[] = (['users', 'organizations', 'admin'] as const).map((key) => ({
    key,
    title: GROUP_TITLES[key],
    accounts: [],
  }))
  for (const account of accounts) {
    const known = KNOWN[account.email.toLowerCase()]
    const key = known?.group ?? (account.role === 'admin' ? 'admin' : 'users')
    groups
      .find((g) => g.key === key)!
      .accounts.push({ ...account, scenarios: known?.scenarios ?? null })
  }
  return groups.filter((g) => g.accounts.length)
}
