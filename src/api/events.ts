import { http } from './http'
import type {
  EventDetails,
  EventFilters,
  EventInput,
  EventSummary,
  Id,
  Page,
  Participation,
  ParticipationStatus,
  UserShort,
} from './types'

export interface Participant extends UserShort {
  contacts?: string | null
}

export const eventsApi = {
  list: (filters: EventFilters = {}) =>
    http.get<Page<EventSummary>>('/events', { query: { ...filters } }),
  get: (id: Id) => http.get<EventDetails>(`/events/${id}`),
  create: (body: EventInput) => http.post<{ id: Id }>('/events', body),
  update: (id: Id, body: Partial<EventInput>) => http.patch<EventDetails>(`/events/${id}`, body),
  cancel: (id: Id, reason: string) => http.post<EventDetails>(`/events/${id}/cancel`, { reason }),

  join: (id: Id, message?: string) =>
    http.post<Participation>(`/events/${id}/join`, message ? { message } : {}),
  leave: (id: Id) => http.delete<Participation>(`/events/${id}/join`),
  myParticipation: (id: Id) => http.get<Participation | null>(`/events/${id}/my-participation`),
  participants: (id: Id) => http.get<Participant[]>(`/events/${id}/participants`),
  requests: (id: Id, status: ParticipationStatus = 'pending') =>
    http.get<Participation[]>(`/events/${id}/requests`, { query: { status } }),
}

export const participationsApi = {
  approve: (pid: Id) => http.post<Participation>(`/participations/${pid}/approve`),
  reject: (pid: Id, reason?: string) =>
    http.post<Participation>(`/participations/${pid}/reject`, reason ? { reason } : {}),
}
