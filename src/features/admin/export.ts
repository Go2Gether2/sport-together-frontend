import type { AdminDashboard, EventSummary, ModerationLog } from '@/api'
import { statusView } from '@/components/ui'
import { eventStatusSlices, moderationSlices, topBy } from './stats'

type Cell = string | number | null | undefined

// Импорт 1С-Битрикс и Excel в русской локали ждут «;» и UTF-8 с BOM — иначе кириллица и столбцы ломаются.
const SEP = ';'
const BOM = '﻿'

function cell(value: Cell): string {
  let s = value == null ? '' : String(value)
  // Названия пишут пользователи: строку с = + - @ таблица приняла бы за формулу.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: Cell[][]): string {
  return BOM + rows.map((r) => r.map(cell).join(SEP)).join('\r\n') + '\r\n'
}

const dateTime = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function organizer(e: EventSummary): string {
  // Имя частного организатора — персональные данные (152-ФЗ), в выгрузку не кладём.
  return e.organizer?.type === 'organization' ? e.organizer.name : 'Частное лицо'
}

export function statsCsv(
  dashboard: AdminDashboard | null,
  events: EventSummary[],
  logs: ModerationLog[],
  now: Date,
): string {
  const rows: Cell[][] = [['Платформа «Вместе» — статистика'], ['Выгружено', dateTime.format(now)]]

  if (dashboard) {
    rows.push(
      [],
      ['Сводка', 'Значение'],
      ['Пользователей', dashboard.users],
      ['Организаций ждут допуска', dashboard.pending_organizations],
      ['Организаций допущено', dashboard.approved_organizations],
      ...eventStatusSlices(dashboard).map((s) => [
        `Мероприятий: ${s.label.toLowerCase()}`,
        s.value,
      ]),
      ['Скрыто сообщений', dashboard.hidden_comments],
    )
  }

  const section = (title: string, slices: { label: string; value: number }[]) => {
    rows.push([], [title, 'Мероприятий'], ...slices.map((s) => [s.label, s.value]))
  }
  section(
    'Вид спорта',
    topBy(events, (e) => e.sport?.name, Infinity),
  )
  section(
    'Город',
    topBy(events, (e) => e.city, Infinity),
  )
  rows.push([], ['Решение модерации', 'Количество'])
  rows.push(...moderationSlices(logs).map((s) => [s.label, s.value]))

  rows.push(
    [],
    [
      'ID',
      'Название',
      'Вид спорта',
      'Город',
      'Начало',
      'Статус',
      'Участников',
      'Мест',
      'Запись',
      'Организатор',
    ],
    ...events.map((e) => [
      e.id,
      e.title,
      e.sport?.name,
      e.city,
      dateTime.format(new Date(e.starts_at)),
      statusView({ kind: 'event', status: e.status }).label,
      e.confirmed_count,
      e.capacity ?? 'без ограничений',
      e.join_mode === 'approval' ? 'по заявке' : 'свободная',
      organizer(e),
    ]),
  )
  return toCsv(rows)
}

export function exportFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `vmeste-statistika-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.csv`
}

export function downloadText(text: string, fileName: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName })
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
