<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import NavIcon from './NavIcon.vue'
import { menuItems } from './nav'

const open = defineModel<boolean>('open', { required: true })

const session = useSessionStore()
const route = useRoute()
const router = useRouter()
const dialog = ref<HTMLDialogElement | null>(null)
const items = computed(() => menuItems(session.isAdmin))

watch(open, (value) => {
  if (value) dialog.value?.showModal()
  else dialog.value?.close()
})

watch(
  () => route.fullPath,
  () => (open.value = false),
)

async function logout() {
  open.value = false
  await session.logout()
  await router.push({ name: 'home' })
}
</script>

<template>
  <dialog
    ref="dialog"
    aria-labelledby="app-menu-title"
    class="m-0 mt-auto max-h-[85vh] w-full max-w-none rounded-t-3xl border-2 border-b-0 border-ink bg-card p-4 text-ink backdrop:bg-ink/40 md:hidden"
    @close="open = false"
  >
    <div class="mb-3 flex items-center justify-between">
      <h2 id="app-menu-title" class="font-display text-lg font-bold">Все разделы</h2>
      <button
        type="button"
        class="grid size-11 place-items-center rounded-full border-2 border-ink text-xl"
        aria-label="Закрыть меню"
        @click="open = false"
      >
        ✕
      </button>
    </div>

    <nav aria-label="Дополнительные разделы">
      <ul class="flex flex-col gap-2">
        <li v-for="item in items" :key="item.label">
          <RouterLink
            :to="item.to"
            class="flex items-center gap-3 rounded-field border-2 border-ink px-4 py-3 font-medium text-ink no-underline hover:bg-cobalt-tint"
          >
            <NavIcon :name="item.icon" />
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="mt-4 border-t-2 border-mute pt-4">
      <p v-if="session.user" class="flex items-center justify-between gap-3">
        <span class="truncate text-ink-2">{{ session.user.name }}</span>
        <button type="button" class="font-bold underline underline-offset-4" @click="logout">
          Выйти
        </button>
      </p>
      <RouterLink
        v-else
        :to="{ name: 'login' }"
        class="font-bold text-ink underline underline-offset-4"
      >
        Войти
      </RouterLink>
      <p class="mt-3 text-sm text-ink-2">
        Карта, друзья, клубы и уведомления появятся здесь, когда заработают.
      </p>
    </div>
  </dialog>
</template>
