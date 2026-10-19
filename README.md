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

## API и моки

Бэкенд — REST `/api/v1`. Клиент — `src/api/`, по модулю на ресурс.

- `VITE_API_MOCK=true` — запросы обслуживает Mock Service Worker (`src/mocks/`). Данные живут в памяти вкладки: действия меняют их по тем же правилам, что и на сервере, а перезагрузка страницы возвращает исходные демо-данные.
- `VITE_API_MOCK=false` — dev-сервер проксирует `/api` на `API_PROXY_TARGET` (по умолчанию `http://localhost:8080`).

Демо-аккаунты (вход по `demo_account_id`):

| Аккаунт | Кто |
|---|---|
| `user` | Анна — организует свои встречи |
| `user2` | Пётр — записывается на чужие события |
| `org_pending` | владелец организации на рассмотрении |
| `org_approved` | владелец допущенного бегового клуба |
| `admin` | администратор |

## Стек

Vue 3, TypeScript, Vite, Vue Router, Pinia, Tailwind CSS 4, MSW, Vitest, ESLint, oxlint, Prettier.

## Структура

| Путь | Что |
|---|---|
| `src/api/` | HTTP-клиент, типы и эндпоинты по ресурсам |
| `src/mocks/` | моки API: демо-данные и обработчики |
| `src/views/` | страницы |
| `src/router/` | маршруты |
| `src/assets/` | стили и тема Tailwind |
| `src/**/__tests__/` | unit-тесты |
| `public/` | статика как есть, в том числе `mockServiceWorker.js` |

## Команда

| Участник | Роль |
|---|---|
| [@rinna32](https://github.com/rinna32) | фронтенд |
| [@sky1768205](https://github.com/sky1768205) | фронтенд |
