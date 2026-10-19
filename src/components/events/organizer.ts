import type { Organizer } from '@/api'

export function organizerName(o: Organizer) {
  return o.type === 'organization' ? o.organization.name : o.user.name
}
