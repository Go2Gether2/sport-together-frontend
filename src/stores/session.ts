import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authApi, setToken, type Organization, type User } from '@/api'

export const useSessionStore = defineStore('session', () => {
  const user = ref<User | null>(null)
  const organization = ref<Organization | null>(null)

  const isAuthenticated = computed(() => user.value !== null)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const hasApprovedOrganization = computed(() => organization.value?.status === 'approved')

  async function refresh() {
    const me = await authApi.me()
    user.value = me.user
    organization.value = me.organization
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

  async function loginDemo(demoAccountId: string) {
    const { token } = await authApi.login({ demo_account_id: demoAccountId })
    await start(token)
  }

  async function loginWithEmail(email: string, password: string) {
    const { token } = await authApi.login({ email, password })
    await start(token)
  }

  function clear() {
    setToken(null)
    user.value = null
    organization.value = null
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
    organization,
    isAuthenticated,
    isAdmin,
    hasApprovedOrganization,
    refresh,
    loginDemo,
    loginWithEmail,
    logout,
    clear,
  }
})
