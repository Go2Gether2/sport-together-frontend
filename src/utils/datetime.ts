const DAY = 24 * 60 * 60 * 1000

/** Дата в формате YYYY-MM-DD по местному времени пользователя. */
export function localDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayMonth = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

export function formatTime(iso: string) {
  return time.format(new Date(iso))
}

/** «Сегодня · 19:00», «Завтра · 07:30», «сб, 24 окт. · 10:00». */
export function formatEventWhen(startsAt: string, endsAt: string | null = null, now = new Date()) {
  const start = new Date(startsAt)
  const diff = Math.round((startOfDay(start).getTime() - startOfDay(now).getTime()) / DAY)
  const day =
    diff === 0
      ? 'Сегодня'
      : diff === 1
        ? 'Завтра'
        : dayMonth.format(start).replace(/^./, (c) => c.toUpperCase())
  const range = endsAt ? `${formatTime(startsAt)}–${formatTime(endsAt)}` : formatTime(startsAt)
  return `${day} · ${range}`
}

export type QuickDate = 'today' | 'tomorrow' | 'weekend'

/** Диапазон дат для быстрых фильтров. Выходные — ближайшие суббота и воскресенье (или оставшиеся из них). */
export function quickDateRange(kind: QuickDate, now = new Date()): { from: string; to: string } {
  const today = startOfDay(now)
  if (kind === 'today') return { from: localDate(today), to: localDate(today) }
  if (kind === 'tomorrow') {
    const t = new Date(today.getTime() + DAY)
    return { from: localDate(t), to: localDate(t) }
  }
  const weekday = today.getDay()
  const toSaturday = weekday === 0 ? -1 : 6 - weekday
  const saturday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + toSaturday)
  const sunday = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 1)
  const from = saturday < today ? today : saturday
  return { from: localDate(from), to: localDate(sunday) }
}
