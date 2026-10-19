import { http } from './http'
import type { Participant } from './events'
import type {
  AdminDashboard,
  Comment,
  EventDetails,
  EventStatus,
  EventSummary,
  Id,
  Organization,
  OrganizationStatus,
  User,
} from './types'

export interface AdminOrganization extends Organization {
  owner: User
  events: EventSummary[]
}

export interface AdminEvent extends EventDetails {
  participants: Participant[]
  comments: Comment[]
}

export const adminApi = {
  dashboard: () => http.get<AdminDashboard>('/admin/dashboard'),

  organizations: (query: { status?: OrganizationStatus; q?: string } = {}) =>
    http.get<Organization[]>('/admin/organizations', { query }),
  organization: (id: Id) => http.get<AdminOrganization>(`/admin/organizations/${id}`),
  approveOrganization: (id: Id) => http.post<Organization>(`/admin/organizations/${id}/approve`),
  rejectOrganization: (id: Id, reason: string) =>
    http.post<Organization>(`/admin/organizations/${id}/reject`, { reason }),

  events: (query: { status?: EventStatus; q?: string; organizer?: Id } = {}) =>
    http.get<EventSummary[]>('/admin/events', { query }),
  event: (id: Id) => http.get<AdminEvent>(`/admin/events/${id}`),
  unpublishEvent: (id: Id, reason: string) =>
    http.post<EventDetails>(`/admin/events/${id}/unpublish`, { reason }),
  deleteEvent: (id: Id, reason: string) =>
    http.delete<EventDetails>(`/admin/events/${id}`, { reason }),
  restoreEvent: (id: Id) => http.post<EventDetails>(`/admin/events/${id}/restore`),

  hideComment: (id: Id, reason: string) =>
    http.post<Comment>(`/admin/comments/${id}/hide`, { reason }),
}
