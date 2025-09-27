<template>
  <div class="min-h-screen">
    <!-- Navigation -->
    <nav class="absolute top-0 left-0 right-0 z-50 bg-transparent">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
          <NuxtLink to="/" class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span class="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">7</span>
            </div>
            <span class="text-xl font-bold text-white">Trip.co</span>
          </NuxtLink>

          <NuxtLink
            to="/register"
            class="bg-white text-gray-900 px-6 py-2 rounded-full font-medium hover:bg-gray-100 transition-colors"
          >
            S'inscrire
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="flex min-h-screen">
      <!-- Left Side - Form -->
      <div class="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 relative">
        <!-- Background overlay for left side -->
        <div class="absolute inset-0 bg-white/90 backdrop-blur-sm lg:bg-white"></div>

        <div class="relative max-w-md w-full space-y-8">
          <div class="text-center">
            <h1 class="text-4xl font-bold text-gray-900 mb-4">Bon retour !</h1>
            <p class="text-lg text-gray-600">
              Connectez-vous pour accéder à vos voyages
            </p>
          </div>

          <div class="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">
            <form @submit.prevent="handleLogin" class="space-y-6">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Adresse email
                </label>
                <input
                  v-model="form.email"
                  type="email"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Mot de passe
                </label>
                <input
                  v-model="form.password"
                  type="password"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div v-if="error" class="p-4 rounded-xl bg-red-50 border border-red-200">
                <p class="text-red-600 text-sm font-medium">{{ error }}</p>
              </div>

              <button
                type="submit"
                :disabled="isLoading"
                class="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <span v-if="isLoading" class="inline-flex items-center">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Connexion...
                </span>
                <span v-else>Se connecter</span>
              </button>
            </form>

            <!-- Divider -->
            <div class="mt-8">
              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-gray-300"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="px-4 bg-white text-gray-500 font-medium">ou</span>
                </div>
              </div>
            </div>

            <!-- Google Login -->
            <div class="mt-8">
              <a
                :href="`${$config.public.apiBase}/auth/google`"
                class="w-full inline-flex justify-center items-center px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fbbc04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuer avec Google
              </a>
            </div>
          </div>

          <!-- Footer Link -->
          <div class="text-center">
            <p class="text-gray-600">
              Pas encore de compte ?
              <NuxtLink to="/register" class="text-orange-500 hover:text-orange-600 font-semibold transition-colors">
                Créer un compte gratuitement
              </NuxtLink>
            </p>
          </div>
        </div>
      </div>

      <!-- Right Side - Hero Image -->
      <div class="hidden lg:flex lg:flex-1 lg:relative">
        <div class="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
            alt="Happy travelers"
            class="w-full h-full object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-l from-black/50 to-black/20"></div>
        </div>

        <!-- Content overlay -->
        <div class="relative h-full flex items-center justify-center p-12">
          <div class="text-center text-white max-w-lg">
            <h2 class="text-4xl font-bold mb-6">
              Vos aventures vous attendent
            </h2>
            <p class="text-xl opacity-90 mb-8">
              Accédez à tous vos voyages, découvrez de nouvelles destinations
              et partagez vos expériences avec la communauté.
            </p>

            <!-- Features -->
            <div class="space-y-4">
              <div class="flex items-center space-x-3 text-left">
                <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span class="text-lg">Planification simplifiée</span>
              </div>
              <div class="flex items-center space-x-3 text-left">
                <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span class="text-lg">Communauté inspirante</span>
              </div>
              <div class="flex items-center space-x-3 text-left">
                <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span class="text-lg">Souvenirs durables</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const authStore = useAuthStore()
const router = useRouter()

const form = reactive({
  email: '',
  password: ''
})

const error = ref('')
const isLoading = computed(() => authStore.isLoading)

const handleLogin = async () => {
  error.value = ''

  try {
    await authStore.login(form)
    router.push('/')
  } catch (err: any) {
    console.error('Login error:', err)
    error.value = err.data?.message || 'Erreur de connexion'
  }
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    router.push('/')
  }
})
</script>