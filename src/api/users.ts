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
  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return http.post<User>('/users/me/avatar', form)
  },
  deleteAvatar: () => http.delete<User>('/users/me/avatar'),
  deleteMe: (password: string) => http.delete<void>('/users/me', { password }),
  myEvents: () => http.get<OrganizerEvent[]>('/users/me/events'),
  myParticipations: (status?: ParticipationStatus) =>
    http.get<MyParticipation[]>('/users/me/participations', { query: { status } }),
}
