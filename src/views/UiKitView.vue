<script setup lang="ts">
import { ref } from 'vue'
import SportIcon from '@/components/illustrations/SportIcon.vue'
import {
  StatusBadge,
  UiAvatarStack,
  UiBadge,
  UiButton,
  UiCard,
  UiCheckbox,
  UiChip,
  UiIconButton,
  UiSeats,
  UiTextField,
} from '@/components/ui'

const query = ref('')
const email = ref('anna@')
const consent = ref(false)
const filter = ref('all')

const filters = [
  { id: 'all', label: 'Все', count: 24 },
  { id: 'today', label: 'Сегодня', count: 7 },
  { id: 'beginners', label: 'Для новичков', count: 11 },
]
const users = [
  { id: '1', name: 'Ольга Котова', avatar_url: null },
  { id: '2', name: 'Ирина Петрова', avatar_url: null },
  { id: '3', name: 'Анна Носова', avatar_url: null },
  { id: '4', name: 'Дмитрий Сидоров', avatar_url: null },
  { id: '5', name: 'Пётр Ли', avatar_url: null },
]
const sports = [
  { icon: 'football', name: 'Футбол' },
  { icon: 'tennis', name: 'Теннис' },
  { icon: 'chess', name: 'Шахматы' },
  { icon: 'bike', name: 'Велосипед' },
  { icon: 'running', name: 'Бег' },
  { icon: null, name: 'Своё' },
]
</script>

<template>
  <main class="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10">
    <header>
      <p class="font-hand text-2xl text-cobalt">витрина компонентов</p>
      <h1 class="font-display text-3xl font-bold">UI-кит</h1>
    </header>

    <section class="flex flex-col gap-3">
      <h2 class="font-display text-xl font-medium">Кнопки</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <UiButton sparks>Войти</UiButton>
        <UiButton variant="accent">Записаться</UiButton>
        <UiButton variant="ghost">Отменить</UiButton>
        <UiButton loading>Записаться</UiButton>
      </div>
      <div class="flex gap-3">
        <UiIconButton label="Меню">☰</UiIconButton>
        <UiIconButton label="Профиль" round filled>☺</UiIconButton>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="font-display text-xl font-medium">Статусы</h2>
      <div class="flex flex-wrap gap-2">
        <StatusBadge :of="{ kind: 'participation', status: 'confirmed' }" />
        <StatusBadge :of="{ kind: 'participation', status: 'pending' }" />
        <StatusBadge :of="{ kind: 'participation', status: 'rejected' }" />
        <StatusBadge :of="{ kind: 'event', status: 'unpublished' }" />
        <StatusBadge :of="{ kind: 'organization', status: 'pending' }" />
        <UiBadge tone="accent">Организатор</UiBadge>
        <UiBadge>По заявке</UiBadge>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div class="flex flex-col gap-3">
        <h2 class="font-display text-xl font-medium">Поля</h2>
        <UiTextField
          v-model="query"
          label="Поиск"
          hide-label
          type="search"
          placeholder="Футбол, йога, шахматы…"
        />
        <UiTextField
          v-model="email"
          label="Почта"
          type="email"
          required
          error="Проверьте адрес: в нём нет домена"
        />
        <UiCheckbox v-model="consent">
          Даю согласие на обработку персональных данных по
          <RouterLink to="/privacy" class="text-cobalt underline">политике</RouterLink>
        </UiCheckbox>
        <div class="flex gap-2 overflow-x-auto">
          <UiChip
            v-for="f in filters"
            :key="f.id"
            :count="f.count"
            :pressed="filter === f.id"
            @click="filter = f.id"
            >{{ f.label }}</UiChip
          >
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <h2 class="font-display text-xl font-medium">Карточка события</h2>
        <UiCard as="article">
          <div class="flex items-center justify-between text-sm font-bold text-cobalt">
            <span>Сегодня · 19:00</span>
            <UiBadge>По заявке</UiBadge>
          </div>
          <h3 class="font-display text-lg font-medium leading-tight">Теннис после работы</h3>
          <p class="text-[15px] text-ink-2">Стадион «Енисей», корт 3 · любой уровень</p>
          <UiSeats :taken="5" :capacity="8"><UiAvatarStack :users="users" /></UiSeats>
          <StatusBadge :of="{ kind: 'participation', status: 'pending' }" />
        </UiCard>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="font-display text-xl font-medium">Направления</h2>
      <div class="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <div
          v-for="s in sports"
          :key="s.name"
          class="flex flex-col items-center gap-1 rounded-[18px] border-2 border-ink bg-card p-2.5 text-sm font-medium"
          :class="{ 'border-dashed text-cobalt': !s.icon }"
        >
          <SportIcon :name="s.icon" />
          {{ s.name }}
        </div>
      </div>
    </section>
  </main>
</template>
