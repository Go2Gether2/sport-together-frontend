<script setup lang="ts">
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import AppMenu from '@/components/layout/AppMenu.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTabBar from '@/components/layout/AppTabBar.vue'

const menuOpen = ref(false)
</script>

<template>
  <a
    href="#main"
    class="sr-only z-50 rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
  >
    Перейти к содержимому
  </a>
  <div class="lg:grid lg:grid-cols-[288px_minmax(0,1fr)]">
    <AppSidebar />
    <div class="flex min-h-dvh min-w-0 flex-col">
      <AppHeader @open-menu="menuOpen = true" />
      <main
        id="main"
        tabindex="-1"
        class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 outline-none lg:px-8 lg:py-8"
      >
        <RouterView />
      </main>
      <AppFooter class="pb-24 lg:pb-0" />
    </div>
  </div>
  <AppTabBar />
  <AppMenu v-model:open="menuOpen" />
</template>
