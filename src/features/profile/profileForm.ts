import type { Id, Level, ProfileInput, User } from '@/api'

export interface ProfileFormState {
  name: string
  city: string
  level: Level | ''
  bio: string
  sportIds: Id[]
  avatar: string
}

export type ProfileFormErrors = Partial<Record<keyof ProfileFormState, string>>

export const BIO_MAX = 500

export function profileFormFrom(user: User): ProfileFormState {
  return {
    name: user.name,
    city: user.city ?? '',
    level: user.level ?? '',
    bio: user.bio ?? '',
    sportIds: [...user.sport_ids],
    avatar: user.avatar_url ?? '',
  }
}

export function validateProfileForm(form: ProfileFormState): ProfileFormErrors {
  const errors: ProfileFormErrors = {}
  const name = form.name.trim()
  if (!name) errors.name = 'Как к вам обращаться?'
  else if (name.length > 60) errors.name = 'Не длиннее 60 символов'
  if (form.bio.trim().length > BIO_MAX) errors.bio = `Не длиннее ${BIO_MAX} символов`
  return errors
}

export function toProfileInput(form: ProfileFormState): ProfileInput {
  return {
    name: form.name.trim(),
    city: form.city.trim(),
    bio: form.bio.trim(),
    level: form.level || undefined,
    sport_ids: form.sportIds,
    avatar_url: form.avatar,
  }
}

export function toggleSport(ids: Id[], id: Id): Id[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}
