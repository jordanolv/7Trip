export default defineNuxtRouteMiddleware((to) => {
  // Appliquer le middleware auth automatiquement pour les routes du groupe (authenticated)
  if (to.path.includes('/(authenticated)/') ||
      to.path === '/profil' ||
      to.path.startsWith('/trips/')) {

    const { $auth } = useNuxtApp()
    const authStore = useAuthStore()

    if (!authStore.isAuthenticated) {
      return navigateTo('/login')
    }
  }
})