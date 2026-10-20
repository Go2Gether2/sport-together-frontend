import type { RouteLocationRaw } from 'vue-router'
import type { SportIconName } from '@/components/illustrations/SportIcon.vue'

// Сторис будут приходить с бэка (данные в БД); пока набор задан здесь — заменить источник, форма та же.
export interface StorySlide {
  title: string
  text: string
  cta?: { label: string; to: RouteLocationRaw }
}

export interface Story {
  id: string
  label: string
  icon: SportIconName
  bg: string
  slides: StorySlide[]
}

/** Сколько показывается один слайд, мс. */
export const SLIDE_MS = 6000

export const STORIES: Story[] = [
  {
    id: 'start',
    label: 'Как начать',
    icon: 'custom',
    bg: 'bg-accent',
    slides: [
      {
        title: 'Найдите мероприятие',
        text: 'В каталоге — встречи по видам спорта, городу, дате и уровню.',
        cta: { label: 'Открыть каталог', to: { name: 'events' } },
      },
      {
        title: 'Запишитесь',
        text: 'На открытые встречи — сразу, на остальные — заявкой, организатор ответит.',
      },
      {
        title: 'Договоритесь в обсуждении',
        text: 'У каждого мероприятия есть чат: спросите, что взять с собой и где встречаемся.',
      },
    ],
  },
  {
    id: 'clubs',
    label: 'Битва клубов',
    icon: 'football',
    bg: 'bg-orange',
    slides: [
      {
        title: 'Клубы соревнуются',
        text: 'Кто за осень проведёт больше встреч и соберёт больше участников.',
      },
      {
        title: 'Поддержите свой клуб',
        text: 'Записывайтесь на встречи клуба — каждая запись идёт в общий счёт.',
        cta: { label: 'Смотреть клубы', to: { name: 'organizations' } },
      },
    ],
  },
  {
    id: 'running',
    label: 'Бег',
    icon: 'running',
    bg: 'bg-accent-soft',
    slides: [
      {
        title: 'Пробежки по выходным',
        text: 'Группы для любого темпа — от первых 3 км до подготовки к полумарафону.',
        cta: { label: 'Найти пробежку', to: { name: 'events', query: { q: 'бег' } } },
      },
    ],
  },
  {
    id: 'chess',
    label: 'Шахматы',
    icon: 'chess',
    bg: 'bg-lilac',
    slides: [
      {
        title: 'Неделя шахмат',
        text: 'Партии в парках и клубах. Новичкам покажут, как ходят фигуры.',
        cta: { label: 'Найти партию', to: { name: 'events', query: { q: 'шахмат' } } },
      },
    ],
  },
  {
    id: 'organize',
    label: 'Своя встреча',
    icon: 'tennis',
    bg: 'bg-card',
    slides: [
      {
        title: 'Не нашли компанию?',
        text: 'Создайте мероприятие сами: время, место, сколько нужно людей — и ждите участников.',
        cta: { label: 'Создать мероприятие', to: { name: 'event-create' } },
      },
    ],
  },
]

export interface StoryPosition {
  story: number
  slide: number
}

/** Следующий или предыдущий слайд с переходом между сторис; null — дальше некуда. */
export function stepStory(
  stories: Story[],
  at: StoryPosition,
  direction: 1 | -1,
): StoryPosition | null {
  const slide = at.slide + direction
  if (slide >= 0 && slide < (stories[at.story]?.slides.length ?? 0)) {
    return { story: at.story, slide }
  }
  const story = at.story + direction
  const target = stories[story]
  if (!target) return null
  return { story, slide: direction === 1 ? 0 : target.slides.length - 1 }
}

/** Непросмотренные — первыми, порядок внутри групп сохраняется. */
export function sortBySeen(stories: Story[], seen: ReadonlySet<string>): Story[] {
  return [...stories.filter((s) => !seen.has(s.id)), ...stories.filter((s) => seen.has(s.id))]
}

// Что уже смотрели — удобство конкретного браузера, не данные: при ошибке хранилища просто всё «новое».
const KEY = 'stories-seen'

export function readSeen(): Set<string> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return new Set(Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

export function saveSeen(seen: ReadonlySet<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...seen]))
  } catch {
    // Хранилище недоступно — отметка живёт до перезагрузки.
  }
}
