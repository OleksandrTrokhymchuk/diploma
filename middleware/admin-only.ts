export default defineNuxtRouteMiddleware(async (to) => {
  const { user, refresh } = useUserSession()
  await refresh()

  if (!user.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }

  if (user.value.role !== 'ADMIN') {
    return navigateTo('/catalog')
  }
})
