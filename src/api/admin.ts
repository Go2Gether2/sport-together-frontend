import { http } from './http'
import type {
  AdminDashboard,
  AdminEventDetails,
  AdminOrganizationDetails,
  Comment,
  EventDetails,
  EventStatus,
  EventSummary,
  Id,
  ModerationLog,
  Organization,
  OrganizationStatus,
  Page,
} from './types'

type PageQuery = { page?: number; size?: number }

export const adminApi = {
  dashboard: () => http.get<AdminDashboard>('/admin/dashboard'),

  organizations: (query: { status?: OrganizationStatus; q?: string } & PageQuery = {}) =>
    http.get<Page<Organization>>('/admin/organizations', { query }),
  organization: (id: Id) => http.get<AdminOrganizationDetails>(`/admin/organizations/${id}`),
  approveOrganization: (id: Id) => http.post<Organization>(`/admin/organizations/${id}/approve`),
  rejectOrganization: (id: Id, reason: string) =>
    http.post<Organization>(`/admin/organizations/${id}/reject`, { reason }),

  events: (
    query: { status?: EventStatus; q?: string; organizer?: Id; organization?: Id } & PageQuery = {},
  ) => http.get<Page<EventSummary>>('/admin/events', { query }),
  event: (id: Id) => http.get<AdminEventDetails>(`/admin/events/${id}`),
  unpublishEvent: (id: Id, reason: string) =>
    http.post<EventDetails>(`/admin/events/${id}/unpublish`, { reason }),
  deleteEvent: (id: Id, reason: string) =>
    http.delete<EventDetails>(`/admin/events/${id}`, { reason }),
  restoreEvent: (id: Id) => http.post<EventDetails>(`/admin/events/${id}/restore`),

  hideComment: (id: Id, reason: string) =>
    http.post<Comment>(`/admin/comments/${id}/hide`, { reason }),

  auditLog: (query: { target_type?: 'organization' | 'event' | 'comment' } & PageQuery = {}) =>
    http.get<Page<ModerationLog>>('/admin/audit-log', { query }),
}
