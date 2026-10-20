import type { Id, Level, ProfileInput, User } from '@/api'
import { t } from '@/i18n'

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
  if (!name) errors.name = t('profile.errors.name')
  else if (name.length > 60) errors.name = t('common.maxLength', { n: 60 })
  if (form.bio.trim().length > BIO_MAX) errors.bio = t('common.maxLength', { n: BIO_MAX })
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
