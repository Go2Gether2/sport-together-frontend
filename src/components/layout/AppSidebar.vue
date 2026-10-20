<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import AppLogo from './AppLogo.vue'
import ThemeSwitch from './ThemeSwitch.vue'
import NavIcon from './NavIcon.vue'
import { CREATE_ITEM, desktopItems } from './nav'

const session = useSessionStore()
const router = useRouter()
const items = computed(() => desktopItems(session.isAdmin))

async function logout() {
  await session.logout()
  await router.push({ name: 'home' })
}
</script>

<template>
  <aside class="sticky top-0 hidden h-dvh p-4 pr-0 lg:block">
    <div class="flex h-full flex-col gap-5 overflow-y-auto rounded-card bg-card p-4">
      <AppLogo class="px-2" />

      <RouterLink
        v-if="!session.isAdmin"
        :to="CREATE_ITEM.to"
        class="flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-5 font-bold text-white no-underline hover:bg-ink/85"
      >
        <span aria-hidden="true" class="text-xl leading-none">+</span>
        {{ CREATE_ITEM.label }}
      </RouterLink>

      <nav aria-label="Разделы">
        <ul class="flex flex-col gap-1">
          <li v-for="item in items" :key="item.label">
            <RouterLink
              :to="item.to"
              class="flex items-center gap-3 rounded-full px-4 py-2.5 font-semibold text-ink-2 no-underline hover:bg-field hover:text-ink"
              active-class="!bg-accent !text-ink"
            >
              <NavIcon :name="item.icon" />
              {{ item.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>

      <div class="mt-auto flex flex-col gap-3 rounded-[24px] bg-field p-3">
        <ThemeSwitch />
        <template v-if="session.user">
          <div class="flex items-center gap-3">
            <UiAvatar :name="session.user.name" :url="session.user.avatar_url" />
            <span class="min-w-0 truncate font-semibold">{{ session.user.name }}</span>
          </div>
          <div class="grid grid-cols-[1fr_auto] gap-2">
            <RouterLink
              :to="{ name: 'login' }"
              class="rounded-full bg-card px-2 py-2 text-center text-sm font-semibold whitespace-nowrap text-ink no-underline hover:bg-mute"
            >
              Сменить роль
            </RouterLink>
            <button
              type="button"
              class="rounded-full bg-card px-4 py-2 text-sm font-semibold whitespace-nowrap hover:bg-mute"
              @click="logout"
            >
              Выйти
            </button>
          </div>
        </template>
        <RouterLink
          v-else
          :to="{ name: 'login' }"
          class="rounded-full bg-ink px-4 py-2.5 text-center font-bold text-white no-underline"
        >
          Войти
        </RouterLink>
      </div>
    </div>
  </aside>
</template>
