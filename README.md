# sport-together-frontend

Интерфейс платформы совместных спортивных активностей: поиск компании для занятий спортом, создание мероприятий и запись на них, страницы организаций и модерация.

## Запуск

Нужны Node.js 24 и pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

| Команда | Что делает |
|---|---|
| `pnpm dev` | dev-сервер на http://localhost:5173 |
| `pnpm build` | сборка в `dist/` |
| `pnpm lint` | oxlint + ESLint |
| `pnpm typecheck` | проверка типов (vue-tsc) |
| `pnpm test` | unit-тесты (Vitest) |
| `pnpm format` | Prettier для `src/` |

## API

Бэкенд — REST `/api/v1`. В разработке dev-сервер проксирует `/api` на `API_PROXY_TARGET` (по умолчанию `http://localhost:8080`). Переменная `VITE_API_MOCK=true` включает моки, тогда бэк не нужен.

## Стек

Vue 3, TypeScript, Vite, Vue Router, Pinia, Tailwind CSS 4, Vitest, ESLint, oxlint, Prettier.

## Структура

| Путь | Что |
|---|---|
| `src/views/` | страницы |
| `src/router/` | маршруты |
| `src/assets/` | стили и тема Tailwind |
| `src/__tests__/` | unit-тесты |
| `public/` | статика как есть |

## Команда

| Участник | Роль |
|---|---|
| [@rinna32](https://github.com/rinna32) | фронтенд |
| [@sky1768205](https://github.com/sky1768205) | фронтенд |
