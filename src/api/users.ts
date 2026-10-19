import { http } from './http'
import type { EventSummary, Id, Level, Participation, ParticipationStatus, User } from './types'

export interface ProfileInput {
  name?: string
  city?: string
  bio?: string
  sport_ids?: Id[]
  level?: Level
}

export interface MyEvent extends EventSummary {
  pending_requests_count: number
}

export interface MyParticipation extends Participation {
  event: EventSummary
}

export const usersApi = {
  get: (id: Id) => http.get<User & { events: EventSummary[] }>(`/users/${id}`),
  updateMe: (body: ProfileInput) => http.patch<User>('/users/me', body),
  myEvents: () => http.get<MyEvent[]>('/users/me/events'),
  myParticipations: (status?: ParticipationStatus) =>
    http.get<MyParticipation[]>('/users/me/participations', { query: { status } }),
}
