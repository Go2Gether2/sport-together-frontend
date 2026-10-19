<script setup lang="ts">
import { RouterLink } from 'vue-router'
import NavIcon from './NavIcon.vue'
import { CREATE_ITEM, tabBarItems } from './nav'

const [left, right] = tabBarItems()
</script>

<template>
  <nav
    aria-label="Основные разделы"
    class="fixed inset-x-2 bottom-2 z-20 grid grid-cols-5 items-end rounded-3xl border-2 border-ink bg-card px-1 py-1.5 md:hidden"
  >
    <RouterLink
      v-for="item in left"
      :key="item.label"
      :to="item.to"
      class="flex min-w-0 flex-col items-center gap-0.5 text-center text-[11px] break-words leading-tight text-ink-2 no-underline"
      exact-active-class="font-bold !text-ink"
    >
      <NavIcon :name="item.icon" />
      {{ item.label }}
    </RouterLink>

    <RouterLink
      :to="CREATE_ITEM.to"
      class="flex min-w-0 flex-col items-center gap-0.5 text-center text-[11px] break-words font-bold leading-tight text-cobalt no-underline"
    >
      <span
        aria-hidden="true"
        class="-mt-6 grid size-12 place-items-center rounded-full border-2 border-ink bg-cobalt text-3xl leading-none text-white"
        >+</span
      >
      {{ CREATE_ITEM.label }}
    </RouterLink>

    <RouterLink
      v-for="item in right"
      :key="item.label"
      :to="item.to"
      class="flex min-w-0 flex-col items-center gap-0.5 text-center text-[11px] break-words leading-tight text-ink-2 no-underline"
      active-class="font-bold !text-ink"
    >
      <NavIcon :name="item.icon" />
      {{ item.label }}
    </RouterLink>
  </nav>
</template>
