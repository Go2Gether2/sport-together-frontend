import { describe, it, expect } from 'vitest'
import type { User } from '@/api'
import {
  profileFormFrom,
  toProfileInput,
  toggleSport,
  validateProfileForm,
} from '@/features/profile/profileForm'

const user = {
  name: 'Анна Смирнова',
  city: null,
  level: null,
  bio: null,
  sport_ids: [1, 2],
} as unknown as User

describe('profileForm', () => {
  it('заполняет форму из профиля, пустые поля — пустые строки', () => {
    const form = profileFormFrom(user)
    expect(form).toEqual({
      name: 'Анна Смирнова',
      city: '',
      level: '',
      bio: '',
      sportIds: [1, 2],
      avatar: '',
    })
    form.sportIds.push(3)
    expect(user.sport_ids).toEqual([1, 2])
  })

  it('имя обязательно, о себе — не длиннее 500', () => {
    expect(validateProfileForm({ ...profileFormFrom(user), name: '  ' }).name).toBeDefined()
    expect(
      validateProfileForm({ ...profileFormFrom(user), bio: 'x'.repeat(501) }).bio,
    ).toBeDefined()
    expect(validateProfileForm(profileFormFrom(user))).toEqual({})
  })

  it('собирает тело PATCH /users/me', () => {
    const input = toProfileInput({
      ...profileFormFrom(user),
      city: ' Красноярск ',
      level: 'amateur',
      avatar: 'preset:tennis',
    })
    expect(input).toEqual({
      name: 'Анна Смирнова',
      city: 'Красноярск',
      bio: '',
      level: 'amateur',
      sport_ids: [1, 2],
      avatar_url: 'preset:tennis',
    })
    expect(toProfileInput(profileFormFrom(user)).level).toBeUndefined()
  })

  it('переключает интересы', () => {
    expect(toggleSport([1, 2], 2)).toEqual([1])
    expect(toggleSport([1], 3)).toEqual([1, 3])
  })
})
