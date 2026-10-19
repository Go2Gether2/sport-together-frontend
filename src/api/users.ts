import { http } from './http'
import type {
  Id,
  MyParticipation,
  OrganizerEvent,
  ParticipationStatus,
  ProfileInput,
  PublicUser,
  User,
} from './types'

export const usersApi = {
  get: (id: Id) => http.get<PublicUser>(`/users/${id}`),
  updateMe: (body: ProfileInput) => http.patch<User>('/users/me', body),
  deleteMe: (password: string) => http.delete<void>('/users/me', { password }),
  myEvents: () => http.get<OrganizerEvent[]>('/users/me/events'),
  myParticipations: (status?: ParticipationStatus) =>
    http.get<MyParticipation[]>('/users/me/participations', { query: { status } }),
}
