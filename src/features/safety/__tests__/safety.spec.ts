import { describe, it, expect } from 'vitest'
import type { SafetyBanner, SafetyBannerDetails } from '@/api'
import { bannerToStory, pickForEvent } from '@/features/safety/safety'

const banner = (id: number, patch: Partial<SafetyBanner> = {}): SafetyBanner => ({
  id,
  title: `Баннер ${id}`,
  subtitle: null,
  category: 'safety_rules',
  cover_url: null,
  accent_color: '#1F6F43',
  sport_id: null,
  published: true,
  ...patch,
})

describe('bannerToStory', () => {
  it('слайды баннера — слайды сторис, оговорка — на последнем', () => {
    const details: SafetyBannerDetails = {
      ...banner(5, { title: 'Безопасная пробежка', category: 'safety_rules' }),
      slides: [
        { position: 1, title: 'Будьте заметны', body: 'Светоотражатели', image_url: null },
        { position: 2, title: null, body: 'Навстречу движению', image_url: null },
      ],
      disclaimer: 'Не заменяет врача',
    }
    const story = bannerToStory(details, 'Бег')
    expect(story).toMatchObject({ id: 'safety-5', label: 'Безопасная пробежка', icon: 'running' })
    expect(story.slides.map((s) => s.title)).toEqual(['Будьте заметны', 'Безопасная пробежка'])
    expect(story.slides[0]!.note).toBeUndefined()
    expect(story.slides[1]!.note).toBe('Не заменяет врача')
  })
})

describe('pickForEvent', () => {
  it('сначала по этому виду спорта, потом общие правила; чужие и снятые — нет', () => {
    const list = [
      banner(1, { category: 'emergency' }),
      banner(2, { category: 'first_aid' }),
      banner(3, { sport_id: 3 }),
      banner(4, { sport_id: 7 }),
      banner(5),
      banner(6, { published: false }),
    ]
    expect(pickForEvent(list, 3).map((b) => b.id)).toEqual([3, 5, 2])
  })
})
