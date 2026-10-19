import type { Id, Level, ProfileInput, User } from '@/api'

export interface ProfileFormState {
  name: string
  city: string
  level: Level | ''
  bio: string
  sportIds: Id[]
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
  }
}

export function toggleSport(ids: Id[], id: Id): Id[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}
