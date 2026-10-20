<script setup lang="ts">
import { APP_NAME } from '@/router/access'
</script>

<template>
  <article class="mx-auto flex max-w-2xl flex-col gap-5">
    <header>
      <p class="font-hand text-xl text-accent-ink">документы</p>
      <h1 class="font-display text-2xl font-bold">Политика обработки персональных данных</h1>
    </header>

    <section class="flex flex-col gap-1">
      <h2 class="text-lg font-bold">Кто обрабатывает</h2>
      <p class="text-ink-2">
        Команда разработчиков прототипа «{{ APP_NAME }}». Это некоммерческий учебный прототип: все
        профили и мероприятия в нём вымышленные, реальные данные не собираем.
      </p>
    </section>

    <section class="flex flex-col gap-1">
      <h2 class="text-lg font-bold">Какие данные и зачем</h2>
      <p class="text-ink-2">
        Имя, почта, город, интересы и уровень подготовки, записи на мероприятия и сообщения в
        обсуждениях. Только то, что нужно, чтобы вы могли записываться на занятия, а организатор —
        видеть участников и отвечать на вопросы.
      </p>
    </section>

    <section class="flex flex-col gap-1">
      <h2 class="text-lg font-bold">Основание</h2>
      <p class="text-ink-2">
        Согласие, которое вы даёте отдельной отметкой при регистрации (статья 6 Федерального закона
        № 152-ФЗ «О персональных данных»).
      </p>
    </section>

    <section class="flex flex-col gap-1">
      <h2 class="text-lg font-bold">Хранение и передача</h2>
      <p class="text-ink-2">
        Данные хранятся на серверах в России до окончания демонстрации прототипа, затем удаляются.
        Третьим лицам не передаются.
      </p>
    </section>

    <section class="flex flex-col gap-1">
      <h2 class="text-lg font-bold">Cookie</h2>
      <p class="text-ink-2">
        Используем только необходимые: для входа и настроек. Аналитику и рекламные счётчики не
        подключаем. Выбранную тему оформления запоминаем в вашем браузере, на сервер она не
        передаётся.
      </p>
    </section>

    <section class="flex flex-col gap-1">
      <h2 class="text-lg font-bold">Ваши права</h2>
      <p class="text-ink-2">
        Вы можете посмотреть, исправить или удалить свои данные в профиле, а также отозвать
        согласие.
      </p>
    </section>

    <p class="text-sm text-ink-2">Редакция от 19 октября 2026 года.</p>
  </article>
</template>
