import { http } from './http'
import type { EventSummary, Id, Organization, OrganizationInput } from './types'

export const organizationsApi = {
  create: (body: OrganizationInput) => http.post<Organization>('/organizations', body),
  my: () => http.get<Organization | null>('/organizations/my'),
  update: (id: Id, body: Partial<OrganizationInput>) =>
    http.patch<Organization>(`/organizations/${id}`, body),
  resubmit: (id: Id) => http.post<Organization>(`/organizations/${id}/resubmit`),
  list: (query: { q?: string; sport?: Id; city?: string } = {}) =>
    http.get<Organization[]>('/organizations', { query }),
  get: (id: Id) => http.get<Organization>(`/organizations/${id}`),
  events: (id: Id) => http.get<EventSummary[]>(`/organizations/${id}/events`),
}
