import type { RouteLocationRaw } from 'vue-router'
import type { SportIconName } from '@/components/illustrations/SportIcon.vue'

// Акций в API нет — набор задаём здесь. Баннер виден только в свои даты (включительно, по местному времени).
export interface Promo {
  id: string
  tag: string
  title: string
  text: string
  starts: string
  ends: string
  icon: SportIconName
  bg: string
  cta: string
  to: RouteLocationRaw
}

export const PROMOS: Promo[] = [
  {
    id: 'club-battle',
    tag: 'Битва клубов',
    title: 'Чей клуб соберёт больше людей?',
    text: 'Организации соревнуются, кто проведёт больше встреч за осень. Запишитесь — поддержите свой клуб.',
    starts: '2026-10-01',
    ends: '2026-11-30',
    icon: 'football',
    bg: 'bg-orange',
    cta: 'Смотреть клубы',
    to: { name: 'organizations' },
  },
  {
    id: 'activity-marathon',
    tag: 'Марафон активности',
    title: '10 тренировок за месяц',
    text: 'Отмечайтесь на любых мероприятиях и держите ритм — вместе проще не бросить.',
    starts: '2026-10-15',
    ends: '2026-11-15',
    icon: 'running',
    bg: 'bg-lilac',
    cta: 'Найти тренировку',
    to: { name: 'events' },
  },
  {
    id: 'run-october',
    tag: 'Беговой сезон',
    title: 'Пробежки по выходным',
    text: 'Групповые пробежки для любого темпа: от первых 3 км до подготовки к полумарафону.',
    starts: '2026-09-15',
    ends: '2026-11-30',
    icon: 'running',
    bg: 'bg-accent-soft',
    cta: 'Смотреть пробежки',
    to: { name: 'events', query: { q: 'бег' } },
  },
  {
    id: 'chess-week',
    tag: 'Неделя шахмат',
    title: 'Турниры и блиц для всех',
    text: 'Партии в парках и клубах города. Новичкам покажут, как ходят фигуры.',
    starts: '2026-10-19',
    ends: '2026-11-01',
    icon: 'chess',
    bg: 'bg-card',
    cta: 'Найти партию',
    to: { name: 'events', query: { q: 'шахмат' } },
  },
]

const day = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function activePromos(now: Date, promos: Promo[] = PROMOS): Promo[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return promos.filter((p) => day(p.starts).getTime() <= today && today <= day(p.ends).getTime())
}

const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })

export function promoPeriod(p: Promo): string {
  return `до ${dayMonth.format(day(p.ends))}`
}
