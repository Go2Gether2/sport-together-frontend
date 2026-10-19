import { http } from './http'
import type { Id, Sport } from './types'

export const sportsApi = {
  list: (q?: string) => http.get<Sport[]>('/sports', { query: { q } }),
  create: (name: string) => http.post<Sport>('/sports', { name }),
  get: (id: Id) => http.get<Sport & { active_events_count: number }>(`/sports/${id}`),
}
