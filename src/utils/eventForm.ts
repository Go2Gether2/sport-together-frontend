import type { EventInput, Id, JoinMode, Level } from '@/api/types'

export const NEW_SPORT_PREFIX = 'new:'

export interface EventFormState {
  title: string
  description: string
  /** id направления из справочника или `new:<название>` для своего. */
  sport: string | null
  date: string
  startTime: string
  endTime: string
  address: string
  locationNote: string
  level: Level | ''
  joinMode: JoinMode | ''
  capacity: string
  requirements: string
  equipment: string
  organizationId: Id | null
}

export type EventFormErrors = Partial<Record<keyof EventFormState, string>>

export function emptyEventForm(): EventFormState {
  return {
    title: '',
    description: '',
    sport: null,
    date: '',
    startTime: '',
    endTime: '',
    address: '',
    locationNote: '',
    level: '',
    joinMode: '',
    capacity: '',
    requirements: '',
    equipment: '',
    organizationId: null,
  }
}

export function newSportValue(name: string): string {
  return `${NEW_SPORT_PREFIX}${name}`
}

// Дата и время из полей — местные; на сервер уходят в ISO с учётом часового пояса браузера.
export function toIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null
  const d = new Date(`${date}T${time}:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function validateEventForm(form: EventFormState, now = new Date()): EventFormErrors {
  const errors: EventFormErrors = {}
  if (!form.title.trim()) errors.title = 'Укажите название'
  else if (form.title.trim().length > 120) errors.title = 'Не длиннее 120 символов'
  if (!form.sport) errors.sport = 'Выберите направление или впишите своё'
  if (!form.date) errors.date = 'Укажите дату'
  if (!form.startTime) errors.startTime = 'Укажите время начала'

  const start = toIso(form.date, form.startTime)
  if (start && new Date(start) <= now) errors.startTime = 'Время начала уже прошло'
  if (start && form.endTime) {
    const end = toIso(form.date, form.endTime)
    if (!end || new Date(end) <= new Date(start)) errors.endTime = 'Окончание позже начала'
  }

  if (!form.address.trim()) errors.address = 'Укажите место'
  if (!form.joinMode) errors.joinMode = 'Выберите, как записываться'
  const capacity = capacityText(form)
  if (capacity) {
    const n = Number(capacity)
    if (!Number.isInteger(n) || n < 1) errors.capacity = 'Целое число, не меньше 1'
    else if (n > 1000) errors.capacity = 'Не больше 1000'
  }
  return errors
}

// Vue приводит значение поля type="number" к числу, поэтому capacity может прийти не строкой.
function capacityText(form: EventFormState): string {
  return String(form.capacity ?? '').trim()
}

function optional(s: string): string | undefined {
  const t = s.trim()
  return t ? t : undefined
}

/** Собирает тело POST /events. Вызывать только для формы без ошибок. */
export function toEventInput(form: EventFormState): EventInput {
  const startsAt = toIso(form.date, form.startTime)!
  const endsAt = form.endTime ? (toIso(form.date, form.endTime) ?? undefined) : undefined
  const sport = form.sport ?? ''
  const input: EventInput = {
    title: form.title.trim(),
    description: form.description.trim(),
    starts_at: startsAt,
    ends_at: endsAt,
    address: form.address.trim(),
    location_note: optional(form.locationNote),
    requirements: optional(form.requirements),
    equipment: optional(form.equipment),
    level: form.level || undefined,
    join_mode: form.joinMode as JoinMode,
    capacity: capacityText(form) ? Number(capacityText(form)) : undefined,
    organization_id: form.organizationId ?? undefined,
  }
  if (sport.startsWith(NEW_SPORT_PREFIX)) input.sport_name = sport.slice(NEW_SPORT_PREFIX.length)
  else input.sport_id = Number(sport)
  return input
}

const SERVER_FIELDS: Record<string, keyof EventFormState> = {
  title: 'title',
  description: 'description',
  sport_id: 'sport',
  sport_name: 'sport',
  starts_at: 'startTime',
  ends_at: 'endTime',
  address: 'address',
  location_note: 'locationNote',
  level: 'level',
  join_mode: 'joinMode',
  capacity: 'capacity',
  requirements: 'requirements',
  equipment: 'equipment',
  organization_id: 'organizationId',
}

/** Переносит ошибки 422 сервера на поля формы; неизвестные поля возвращает отдельно. */
export function mapServerErrors(fields: Record<string, string>): {
  errors: EventFormErrors
  rest: string[]
} {
  const errors: EventFormErrors = {}
  const rest: string[] = []
  for (const [key, message] of Object.entries(fields)) {
    const field = SERVER_FIELDS[key]
    if (field) errors[field] = message
    else rest.push(message)
  }
  return { errors, rest }
}
