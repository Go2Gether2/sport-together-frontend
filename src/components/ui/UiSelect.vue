<script setup lang="ts">
import { useId } from 'vue'
import type { UiOption } from './options'

withDefaults(
  defineProps<{ label: string; options: UiOption[]; placeholder?: string; hideLabel?: boolean }>(),
  { placeholder: undefined, hideLabel: false },
)
const model = defineModel<string>({ default: '' })
const id = useId()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="font-medium" :class="{ 'sr-only': hideLabel }">{{ label }}</label>
    <div class="relative">
      <select
        :id="id"
        v-model="model"
        class="min-h-12.5 w-full appearance-none rounded-field border-2 border-ink bg-card py-2 pr-10 pl-3.5 text-ink"
      >
        <option v-if="placeholder" value="">{{ placeholder }}</option>
        <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <span
        aria-hidden="true"
        class="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-2"
        >▾</span
      >
    </div>
  </div>
</template>
