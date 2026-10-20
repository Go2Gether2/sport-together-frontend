<script setup lang="ts">
import { useId } from 'vue'
import { THEME_OPTIONS, useTheme } from '@/features/theme/theme'

const theme = useTheme()
// Переключатель есть и в боковом, и в мобильном меню — у каждой группы своё имя, иначе они сбрасывают друг друга.
const name = `theme-${useId()}`
</script>

<template>
  <fieldset class="flex flex-col gap-1.5">
    <legend class="mb-1.5 ml-1 text-sm font-semibold text-ink-2">{{ $t('theme.title') }}</legend>
    <div class="grid grid-cols-3 gap-1 rounded-full bg-card p-1">
      <label
        v-for="o in THEME_OPTIONS"
        :key="o.value"
        class="flex min-h-9 cursor-pointer items-center justify-center rounded-full px-2 text-center text-xs leading-tight font-semibold text-ink-2 hover:text-ink has-checked:bg-ink has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-accent-ink"
      >
        <input v-model="theme" type="radio" :name="name" :value="o.value" class="sr-only" />
        {{ $t(`theme.${o.value}`) }}
      </label>
    </div>
  </fieldset>
</template>
