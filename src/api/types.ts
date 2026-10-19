// Типы по схеме REST API бэкенда. Заменятся сгенерированными из OpenAPI, когда он появится.

export type Id = string
/** ISO 8601 */
export type DateTime = string

export type UserRole = 'user' | 'admin'
export type Level = 'beginner' | 'amateur' | 'pro'

export interface UserShort {
  id: Id
  name: string
  avatar_url: string | null
}

export interface User extends UserShort {
  role: UserRole
  email: string
  city: string | null
  bio: string | null
  level: Level | null
  sport_ids: Id[]
  is_demo: boolean
  created_at: DateTime
}

export type SportCategory = 'team' | 'individual' | 'mind' | 'fitness' | 'other'

export interface Sport {
  id: Id
  name: string
  category: SportCategory
  icon: string | null
  is_custom: boolean
}

export type OrganizationType = 'club' | 'community' | 'federation' | 'company'
export type OrganizationStatus = 'pending' | 'approved' | 'rejected' | 'blocked'

export interface OrganizationShort {
  id: Id
  name: string
}

export interface Organization extends OrganizationShort {
  owner_id: Id
  description: string
  type: OrganizationType
  sport_ids: Id[]
  city: string | null
  contacts: string | null
  status: OrganizationStatus
  reject_reason: string | null
  created_at: DateTime
}

export type JoinMode = 'open' | 'approval'
export type EventStatus = 'published' | 'unpublished' | 'deleted' | 'cancelled'

export type Organizer =
  { type: 'user'; user: UserShort } | { type: 'organization'; organization: OrganizationShort }

export type ParticipationStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'waitlisted'

export interface Participation {
  id: Id
  event_id: Id
  user: UserShort
  status: ParticipationStatus
  message: string | null
  decision_reason: string | null
  decided_at: DateTime | null
  created_at: DateTime
}

export interface EventSummary {
  id: Id
  title: string
  sport: Sport
  organizer: Organizer
  starts_at: DateTime
  ends_at: DateTime | null
  address: string
  lat: number | null
  lng: number | null
  level: Level | null
  join_mode: JoinMode
  capacity: number | null
  participants_count: number
  status: EventStatus
}

export interface EventDetails extends EventSummary {
  description: string
  location_note: string | null
  requirements: string | null
  equipment: string | null
  moderation_reason: string | null
  my_participation: Participation | null
  created_at: DateTime
  updated_at: DateTime
}

export interface EventInput {
  title: string
  description: string
  sport_id?: Id
  sport_name?: string
  starts_at: DateTime
  ends_at?: DateTime
  address: string
  lat?: number
  lng?: number
  location_note?: string
  requirements?: string
  equipment?: string
  level?: Level
  join_mode: JoinMode
  capacity?: number
  organization_id?: Id
}

export interface EventFilters {
  q?: string
  sport?: Id
  city?: string
  date_from?: string
  date_to?: string
  level?: Level
  join_mode?: JoinMode
  organizer?: Id
  page?: number
}

export interface Comment {
  id: Id
  event_id: Id
  author: UserShort
  as_organization: OrganizationShort | null
  is_organizer: boolean
  parent_id: Id | null
  text: string
  is_hidden: boolean
  hidden_reason: string | null
  created_at: DateTime
  updated_at: DateTime
}

export interface CommentInput {
  text: string
  parent_id?: Id
  as_organization_id?: Id
}

export interface OrganizationInput {
  name: string
  description: string
  type: OrganizationType
  sport_ids: Id[]
  city?: string
  contacts?: string
}

export interface DemoAccount {
  id: Id
  title: string
  description: string
}

export interface Me {
  user: User
  organization: Organization | null
}

export interface LoginResult {
  token: string
  user: User
}

export interface AdminDashboard {
  organizations_pending: number
  events_published: number
  events_moderated: number
}

/** Форма пагинации — наше допущение, ждём Swagger. */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
}
