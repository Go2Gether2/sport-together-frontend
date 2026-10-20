<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import SportIcon from '@/components/illustrations/SportIcon.vue'
import { activePromos, promoPeriod } from '@/features/home/promos'

const promos = activePromos(new Date())
const track = ref<HTMLElement | null>(null)

// Первая карточка — приветствие, дальше акции. Листаем на ширину одного баннера; автопрокрутки нет — текст успевают прочитать.
function scrollBy(direction: 1 | -1) {
  const el = track.value
  const card = el?.firstElementChild as HTMLElement | null
  if (!el || !card) return
  el.scrollBy({ left: direction * (card.offsetWidth + 12), behavior: 'smooth' })
}
</script>

<template>
  <section class="relative" aria-label="Главное">
    <ul
      ref="track"
      class="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:scroll-px-0 lg:px-0"
    >
      <li
        class="relative flex w-[85%] flex-none snap-start flex-col gap-3 overflow-hidden rounded-card bg-accent p-5 sm:w-[calc(50%-6px)] sm:p-6"
      >
        <p class="font-hand text-xl text-accent-ink sm:text-2xl">спорт — это когда вместе</p>
        <h1 class="text-2xl leading-tight font-bold sm:max-w-[85%] sm:text-3xl">
          Найдите компанию для спорта
        </h1>
        <RouterLink
          :to="{ name: 'events' }"
          class="mt-auto inline-flex min-h-11 w-fit items-center rounded-full bg-ink px-5 font-bold text-white no-underline hover:bg-ink/85"
        >
          Смотреть мероприятия
        </RouterLink>
        <span
          aria-hidden="true"
          class="pointer-events-none absolute -right-3 -bottom-3 hidden opacity-90 sm:block"
        >
          <SportIcon name="running" :size="96" />
        </span>
      </li>
      <li
        v-for="p in promos"
        :key="p.id"
        class="relative flex w-[85%] flex-none snap-start flex-col gap-3 overflow-hidden rounded-card p-5 sm:w-[calc(50%-6px)] sm:p-6"
        :class="p.bg"
      >
        <p class="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <span class="rounded-full bg-ink px-3 py-1 text-white">{{ p.tag }}</span>
          <span>{{ promoPeriod(p) }}</span>
        </p>
        <h2 class="text-xl leading-tight font-bold sm:max-w-[85%] sm:text-2xl">{{ p.title }}</h2>
        <p class="sm:max-w-[85%]">{{ p.text }}</p>
        <RouterLink
          :to="p.to"
          class="mt-auto inline-flex min-h-11 w-fit items-center rounded-full bg-ink px-5 font-bold text-white no-underline hover:bg-ink/85"
        >
          {{ p.cta }}
        </RouterLink>
        <span
          aria-hidden="true"
          class="pointer-events-none absolute -right-3 -bottom-3 hidden opacity-80 sm:block"
        >
          <SportIcon :name="p.icon" :size="96" />
        </span>
      </li>
    </ul>
    <template v-if="promos.length">
      <button
        type="button"
        class="absolute top-1/2 -left-3 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-card text-xl shadow-md hover:bg-mute sm:grid"
        aria-label="Назад"
        @click="scrollBy(-1)"
      >
        ←
      </button>
      <button
        type="button"
        class="absolute top-1/2 -right-3 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-card text-xl shadow-md hover:bg-mute sm:grid"
        aria-label="Дальше"
        @click="scrollBy(1)"
      >
        →
      </button>
    </template>
  </section>
</template>
