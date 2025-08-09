export default defineNuxtPlugin({
  name: 'auth-init',
  parallel: false,
  async setup() {
    const authStore = useAuthStore()
    
    if (process.client) {
      await authStore.initAuth()
    }
  }
})