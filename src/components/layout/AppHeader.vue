<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { UiIconButton } from '@/components/ui'
import AppLogo from './AppLogo.vue'
import { CREATE_ITEM, desktopItems } from './nav'

defineEmits<{ openMenu: [] }>()

const session = useSessionStore()
const router = useRouter()
const items = computed(() => desktopItems(session.isAdmin))

async function logout() {
  await session.logout()
  await router.push({ name: 'home' })
}
</script>

<template>
  <header class="sticky top-0 z-20 border-b-2 border-ink bg-paper">
    <div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5">
      <AppLogo />

      <nav aria-label="Разделы" class="hidden flex-1 items-center gap-4 lg:flex">
        <RouterLink
          v-for="item in items"
          :key="item.label"
          :to="item.to"
          class="border-b-[3px] border-transparent py-1 font-medium whitespace-nowrap text-ink no-underline hover:text-cobalt"
          active-class="!border-cobalt font-bold text-cobalt"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="ml-auto flex items-center gap-3">
        <RouterLink
          :to="CREATE_ITEM.to"
          class="hidden rounded-full border-2 border-cobalt bg-cobalt px-4 py-1.5 whitespace-nowrap font-bold text-white no-underline hover:bg-cobalt/90 lg:inline-block"
        >
          + {{ CREATE_ITEM.label }}
        </RouterLink>

        <template v-if="session.user">
          <span class="hidden max-w-40 truncate text-ink-2 xl:inline">{{ session.user.name }}</span>
          <RouterLink
            :to="{ name: 'login' }"
            class="hidden font-medium whitespace-nowrap text-ink underline underline-offset-4 hover:text-cobalt xl:inline"
          >
            Сменить роль
          </RouterLink>
          <button
            type="button"
            class="hidden font-medium whitespace-nowrap text-ink underline underline-offset-4 hover:text-cobalt xl:inline"
            @click="logout"
          >
            Выйти
          </button>
        </template>
        <RouterLink
          v-else
          :to="{ name: 'login' }"
          class="font-bold text-ink underline underline-offset-4 hover:text-cobalt"
        >
          Войти
        </RouterLink>

        <UiIconButton
          label="Все разделы"
          :class="session.user ? 'xl:hidden' : 'lg:hidden'"
          @click="$emit('openMenu')"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="4" y="4" width="7" height="7" rx="2" />
            <rect x="13" y="4" width="7" height="7" rx="2" />
            <rect x="4" y="13" width="7" height="7" rx="2" />
            <rect x="13" y="13" width="7" height="7" rx="2" />
          </svg>
        </UiIconButton>
      </div>
    </div>
  </header>
</template>
