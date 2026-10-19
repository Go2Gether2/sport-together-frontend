import type {
  EventStatus,
  Id,
  JoinMode,
  Level,
  Organization,
  ParticipationStatus,
  Sport,
  User,
} from '@/api/types'
import { createSeed } from './seed'

export interface UserRow extends User {
  password: string
  contacts: string | null
  demo_key: string | null
}

export type OrganizationRow = Organization

export interface SportRow extends Sport {
  normalized_name: string
  created_by: Id | null
}

export interface EventRow {
  id: Id
  title: string
  description: string
  sport_id: Id
  organizer_type: 'user' | 'organization'
  organizer_user_id: Id
  organizer_org_id: Id | null
  starts_at: string
  ends_at: string | null
  address: string
  lat: number | null
  lng: number | null
  location_note: string | null
  level: Level | null
  requirements: string | null
  equipment: string | null
  join_mode: JoinMode
  capacity: number | null
  status: EventStatus
  moderation_reason: string | null
  created_at: string
  updated_at: string
}

export interface ParticipationRow {
  id: Id
  event_id: Id
  user_id: Id
  status: ParticipationStatus
  message: string | null
  decision_reason: string | null
  decided_at: string | null
  created_at: string
}

export interface CommentRow {
  id: Id
  event_id: Id
  author_id: Id
  as_organization_id: Id | null
  parent_id: Id | null
  text: string
  is_hidden: boolean
  hidden_reason: string | null
  created_at: string
  updated_at: string
}

export interface Db {
  users: UserRow[]
  organizations: OrganizationRow[]
  sports: SportRow[]
  events: EventRow[]
  participations: ParticipationRow[]
  comments: CommentRow[]
  sessions: Map<string, Id>
}

export const db: Db = {
  users: [],
  organizations: [],
  sports: [],
  events: [],
  participations: [],
  comments: [],
  sessions: new Map(),
}

/** Возвращает моки к исходным демо-данным (для тестов и кнопки сброса). */
export function resetDb(now = new Date()) {
  const seed = createSeed(now)
  db.users = seed.users
  db.organizations = seed.organizations
  db.sports = seed.sports
  db.events = seed.events
  db.participations = seed.participations
  db.comments = seed.comments
  db.sessions = new Map()
}

export function newId() {
  return crypto.randomUUID()
}

export function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ')
}

resetDb()
