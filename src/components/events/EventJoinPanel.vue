<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError, eventsApi, type EventDetails } from '@/api'
import { useSessionStore } from '@/stores/session'
import { StatusBadge, UiButton, UiModal } from '@/components/ui'
import { joinAction } from '@/features/events/participation'
import { formatEventWhen } from '@/utils/datetime'

const props = defineProps<{ event: EventDetails }>()
const emit = defineEmits<{ changed: [] }>()

const session = useSessionStore()
const route = useRoute()

const action = computed(() =>
  joinAction(props.event, { user: session.user, organization: session.organization }),
)
const mine = computed(() => props.event.my_participation)

const busy = ref(false)
const error = ref('')
const notice = ref('')
const applyOpen = ref(false)
const cancelOpen = ref(false)
const message = ref('')
const messageId = useId()

async function run(fn: () => Promise<unknown>, done: string) {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await fn()
    notice.value = done
    emit('changed')
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Не получилось. Попробуйте ещё раз.'
    if (e instanceof ApiError && e.isGone) emit('changed')
  } finally {
    busy.value = false
  }
}

function join() {
  return run(() => eventsApi.join(props.event.id), 'Вы записаны.')
}

async function apply() {
  applyOpen.value = false
  await run(
    () => eventsApi.join(props.event.id, message.value.trim() || undefined),
    'Заявка отправлена. Решение организатора появится здесь.',
  )
  message.value = ''
}

async function leave() {
  cancelOpen.value = false
  await run(() => eventsApi.leave(props.event.id), 'Запись отменена.')
}

const when = computed(() => formatEventWhen(props.event.starts_at, props.event.ends_at))
</script>

<template>
  <section
    aria-labelledby="join-title"
    class="flex flex-col gap-3 rounded-card border-2 border-ink bg-card p-4"
  >
    <h2 id="join-title" class="sr-only">Запись на мероприятие</h2>

    <template v-if="action.kind === 'confirmed'">
      <StatusBadge :of="{ kind: 'participation', status: 'confirmed' }" />
      <p class="font-medium">Ждём вас: {{ when.toLowerCase() }}.</p>
      <UiButton variant="ghost" :disabled="busy" @click="cancelOpen = true"
        >Отменить запись</UiButton
      >
    </template>

    <template v-else-if="action.kind === 'pending'">
      <StatusBadge :of="{ kind: 'participation', status: 'pending' }" />
      <p class="text-ink-2">
        Организатор рассмотрит заявку. Решение появится здесь и в «Моих записях».
      </p>
      <UiButton variant="ghost" :disabled="busy" @click="cancelOpen = true"
        >Отозвать заявку</UiButton
      >
    </template>

    <template v-else-if="action.kind === 'join'">
      <p class="text-ink-2">Свободная запись: вы сразу станете участником.</p>
      <UiButton variant="accent" sparks :loading="busy" @click="join">Записаться</UiButton>
    </template>

    <template v-else-if="action.kind === 'apply'">
      <div v-if="action.again && mine" class="flex flex-col gap-1.5">
        <StatusBadge :of="{ kind: 'participation', status: 'rejected' }" />
        <p v-if="mine.decision_reason" class="text-ink-2">Причина: «{{ mine.decision_reason }}»</p>
      </div>
      <p class="text-ink-2">
        Запись по заявке: организатор примет или отклонит её. До решения вы не участник.
      </p>
      <UiButton variant="accent" sparks :loading="busy" @click="applyOpen = true">
        {{ action.again ? 'Подать заявку снова' : 'Подать заявку' }}
      </UiButton>
    </template>

    <template v-else-if="action.kind === 'login'">
      <p class="text-ink-2">Чтобы записаться, войдите в аккаунт.</p>
      <RouterLink
        :to="{ name: 'login', query: { redirect: route.fullPath } }"
        class="inline-flex min-h-13 items-center justify-center rounded-full border-2 border-ink bg-ink px-5 font-bold text-paper no-underline"
      >
        Войти и записаться
      </RouterLink>
    </template>

    <p v-else-if="action.kind === 'organizer'" class="font-medium">
      Вы организатор этого мероприятия.
    </p>
    <p v-else-if="action.kind === 'admin'" class="text-ink-2">
      Администратор не записывается на мероприятия.
    </p>
    <p v-else-if="action.kind === 'past'" class="text-ink-2">Мероприятие уже прошло.</p>
    <p v-else-if="action.kind === 'full'" class="font-medium">Мест больше нет.</p>

    <p v-if="notice" class="font-medium text-cobalt" role="status">{{ notice }}</p>
    <p v-if="error" class="font-medium text-cobalt" role="alert">✕ {{ error }}</p>

    <UiModal
      v-model:open="applyOpen"
      title="Заявка на участие"
      description="Можно коротко рассказать о себе — организатору будет проще решить."
    >
      <label :for="messageId" class="font-medium">Сообщение организатору (необязательно)</label>
      <textarea
        :id="messageId"
        v-model="message"
        rows="3"
        maxlength="500"
        class="rounded-field border-2 border-ink bg-card p-3 text-ink"
        placeholder="Например: играю второй сезон"
      />
      <template #actions>
        <UiButton variant="ghost" @click="applyOpen = false">Отмена</UiButton>
        <UiButton variant="accent" @click="apply">Отправить заявку</UiButton>
      </template>
    </UiModal>

    <UiModal
      v-model:open="cancelOpen"
      :title="action.kind === 'pending' ? 'Отозвать заявку?' : 'Отменить запись?'"
      description="Место освободится для других. Записаться снова можно, пока мероприятие не началось."
    >
      <template #actions>
        <UiButton variant="ghost" @click="cancelOpen = false">Не отменять</UiButton>
        <UiButton @click="leave">Да, отменить</UiButton>
      </template>
    </UiModal>
  </section>
</template>
