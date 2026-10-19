import { describe, expect, it } from 'vitest'
import type { Comment } from '@/api'
import { buildThread } from '../thread'

const c = (id: string, created_at: string, parent_id: string | null = null) =>
  ({ id, created_at, parent_id }) as Comment

describe('buildThread', () => {
  it('группирует ответы под вопросом по времени, вложенные ответы поднимает в ту же ветку', () => {
    const thread = buildThread([
      c('a2', '2026-10-21T10:05:00Z', 'q1'),
      c('q1', '2026-10-21T10:00:00Z'),
      c('q2', '2026-10-21T10:02:00Z'),
      c('a3', '2026-10-21T10:06:00Z', 'a2'),
    ])
    expect(thread.map((t) => [t.comment.id, t.replies.map((r) => r.id)])).toEqual([
      ['q1', ['a2', 'a3']],
      ['q2', []],
    ])
  })

  it('ответ на удалённое сообщение становится отдельной веткой', () => {
    expect(buildThread([c('a1', '2026-10-21T10:00:00Z', 'gone')]).map((t) => t.comment.id)).toEqual(
      ['a1'],
    )
  })
})
