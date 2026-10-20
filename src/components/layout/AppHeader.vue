<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { UiIconButton } from '@/components/ui'
import AppLogo from './AppLogo.vue'

defineEmits<{ openMenu: [] }>()

const session = useSessionStore()
</script>

<template>
  <header class="sticky top-0 z-20 bg-page lg:hidden">
    <div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
      <AppLogo />

      <div class="ml-auto flex items-center gap-3">
        <RouterLink
          v-if="!session.user"
          :to="{ name: 'login' }"
          class="font-bold text-ink underline underline-offset-4 hover:text-accent-ink"
        >
          {{ $t('common.login') }}
        </RouterLink>

        <UiIconButton :label="$t('nav.allSections')" @click="$emit('openMenu')">
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
