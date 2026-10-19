import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authApi, setToken, type Id, type OrganizationShort, type User } from '@/api'

export const useSessionStore = defineStore('session', () => {
  const user = ref<User | null>(null)
  // У владельца может быть несколько организаций в разных статусах.
  const organizations = ref<OrganizationShort[]>([])

  const isAuthenticated = computed(() => user.value !== null)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const approvedOrganizations = computed(() =>
    organizations.value.filter((o) => o.status === 'approved'),
  )
  const hasApprovedOrganization = computed(() => approvedOrganizations.value.length > 0)

  async function refresh() {
    const me = await authApi.me()
    user.value = me.user
    organizations.value = me.organizations
  }

  async function start(token: string) {
    setToken(token)
    try {
      await refresh()
    } catch (error) {
      setToken(null)
      throw error
    }
  }

  async function loginDemo(demoAccountId: Id) {
    const { token } = await authApi.login({ demo_account_id: demoAccountId })
    await start(token)
  }

  async function register(input: { name: string; email: string; password: string }) {
    const { token } = await authApi.register(input)
    await start(token)
  }

  async function loginWithEmail(email: string, password: string) {
    const { token } = await authApi.login({ email, password })
    await start(token)
  }

  function clear() {
    setToken(null)
    user.value = null
    organizations.value = []
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      clear()
    }
  }

  return {
    user,
    organizations,
    isAuthenticated,
    isAdmin,
    approvedOrganizations,
    hasApprovedOrganization,
    refresh,
    loginDemo,
    loginWithEmail,
    register,
    logout,
    clear,
  }
})
