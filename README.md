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
| `pnpm api:types` | типы из контракта бэка |

## API и моки

Бэкенд — REST `/api/v1`, контракт — `openapi/backend.json` (OpenAPI 3.1, выгружен из бэка). Клиент — `src/api/`, по модулю на ресурс; типы ответов генерируются из контракта:

```bash
pnpm api:types   # openapi/backend.json → src/api/schema.d.ts
```

`src/api/types.ts` уточняет сгенерированные типы: в OpenAPI все поля необязательные, а бэк присылает их всегда (пустые — `null`).

Режим задаётся в `.env.local`:

| Переменная | Значение |
|---|---|
| `VITE_API_MOCK=true` | запросы обслуживает Mock Service Worker (`src/mocks/`), бэк не нужен; данные в памяти вкладки, перезагрузка возвращает демо-данные |
| `VITE_API_MOCK=false` | dev-сервер проксирует `/api` на `API_PROXY_TARGET` |
| `API_PROXY_TARGET` | адрес бэка, по умолчанию `http://localhost:8080` |

Моки повторяют формы и правила бэка: числовые id, страницы с нуля, коды ошибок, снятое событие видят только участники, организатор и администратор.

Демо-аккаунты (вход по `demo_account_id`, на моках и на бэке одинаковые id):

| id | Кто |
|---|---|
| 1 | пользователь, организует свои встречи |
| 2 | второй пользователь, записывается на чужие события |
| 3 | владелец допущенной организации |
| 4 | владелец организаций на рассмотрении и отклонённой |
| 5 | администратор |

## Стек

Vue 3, TypeScript, Vite, Vue Router, Pinia, Tailwind CSS 4, MSW, openapi-typescript, Vitest, ESLint, oxlint, Prettier.

## Структура

| Путь | Что |
|---|---|
| `src/api/` | HTTP-клиент, типы и эндпоинты по ресурсам |
| `openapi/` | контракт бэка для генерации типов |
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
