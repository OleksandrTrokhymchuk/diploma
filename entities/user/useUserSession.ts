import type { PublicUser } from '~/shared/api/types'

export function useUserSession() {
  const user = useState<PublicUser | null>('auth-user', () => null)

  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  async function refresh() {
    const reqFetch = useRequestFetch()
    try {
      user.value = await reqFetch<PublicUser | null>('/api/auth/me')
    } catch {
      user.value = null
    }
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/')
  }

  return { user, isAdmin, refresh, logout }
}
