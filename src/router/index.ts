import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import HomeView from '@/views/HomeView.vue'
import { documentTitle, resolveAccess } from './access'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomeView },
  {
    path: '/events',
    name: 'events',
    component: () => import('@/views/EventsView.vue'),
    meta: { title: 'Мероприятия' },
  },
  {
    path: '/nearby',
    name: 'nearby',
    component: () => import('@/views/NearbyView.vue'),
    meta: { title: 'Рядом со мной' },
  },
  {
    path: '/events/new',
    name: 'event-create',
    component: () => import('@/views/EventFormView.vue'),
    meta: { title: 'Новое мероприятие', requiresAuth: true, noAdmin: true },
  },
  {
    path: '/events/:id/edit',
    name: 'event-edit',
    component: () => import('@/views/EventFormView.vue'),
    meta: { title: 'Изменить мероприятие', requiresAuth: true, noAdmin: true },
  },
  {
    path: '/events/:id/manage',
    name: 'event-manage',
    component: () => import('@/views/EventManageView.vue'),
    meta: { title: 'Заявки и участники', requiresAuth: true },
  },
  {
    path: '/events/:id',
    name: 'event',
    component: () => import('@/views/EventView.vue'),
    meta: { title: 'Мероприятие' },
  },
  {
    path: '/me/events',
    name: 'my-events',
    component: () => import('@/views/MyEventsView.vue'),
    meta: { title: 'Мои мероприятия', requiresAuth: true },
  },
  {
    path: '/me',
    name: 'my-participations',
    component: () => import('@/views/MyParticipationsView.vue'),
    meta: { title: 'Мои записи', requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: 'Профиль', requiresAuth: true },
  },
  {
    path: '/users/:id',
    name: 'user',
    component: () => import('@/views/UserView.vue'),
    meta: { title: 'Профиль' },
  },
  {
    path: '/organizations',
    name: 'organizations',
    component: () => import('@/views/OrganizationsView.vue'),
    meta: { title: 'Организации' },
  },
  {
    path: '/organizations/my',
    name: 'my-organization',
    component: () => import('@/views/MyOrganizationsView.vue'),
    meta: { title: 'Моя организация', requiresAuth: true },
  },
  {
    path: '/organizations/:id',
    name: 'organization',
    component: () => import('@/views/OrganizationView.vue'),
    meta: { title: 'Организация' },
  },
  {
    path: '/admin',
    meta: { adminOnly: true },
    children: [
      {
        path: '',
        name: 'admin',
        component: () => import('@/views/admin/AdminDashboardView.vue'),
        meta: { title: 'Админка' },
      },
      {
        path: 'organizations',
        name: 'admin-organizations',
        component: () => import('@/views/admin/AdminOrganizationsView.vue'),
        meta: { title: 'Админка: организации' },
      },
      {
        path: 'events',
        name: 'admin-events',
        component: () => import('@/views/admin/AdminEventsView.vue'),
        meta: { title: 'Админка: мероприятия' },
      },
    ],
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: 'Вход' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { title: 'Регистрация', guestOnly: true },
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('@/views/PrivacyView.vue'),
    meta: { title: 'Политика обработки персональных данных' },
  },
  {
    path: '/forbidden',
    name: 'forbidden',
    component: () => import('@/views/ForbiddenView.vue'),
    meta: { title: 'Нет доступа' },
  },
  {
    path: '/ui-kit',
    name: 'ui-kit',
    component: () => import('@/views/UiKitView.vue'),
    meta: { title: 'UI-кит' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Страница не найдена' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // Смена фильтров в адресе на той же странице не должна уводить к началу.
  scrollBehavior: (to, from, saved) => saved ?? (to.path === from.path ? false : { top: 0 }),
})

router.beforeEach(async (to) => {
  const session = useSessionStore()
  await session.restore()
  return resolveAccess(to, { isAuthenticated: session.isAuthenticated, isAdmin: session.isAdmin })
})

router.afterEach((to) => {
  document.title = documentTitle(to.meta.title)
})

export default router
