<template>
  <div class="min-h-screen bg-neutral-50">
    <!-- Navigation -->
    <nav class="bg-white/95 backdrop-blur-md border-b border-neutral-200 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
          <NuxtLink to="/" class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span class="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">7</span>
            </div>
            <span class="text-xl font-bold text-gray-900">Trip.co</span>
          </NuxtLink>

          <div class="flex items-center space-x-4">
            <NuxtLink
              to="/trips/my-trips"
              class="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Mes voyages
            </NuxtLink>
            <UserMenu :user="user" @logout="handleLogout" />
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <!-- Status Message -->
      <div v-if="statusMessage.text" class="mb-8">
        <div
          class="p-4 rounded-xl flex items-center space-x-3"
          :class="{
            'bg-green-50 border border-green-200': statusMessage.type === 'success',
            'bg-red-50 border border-red-200': statusMessage.type === 'error'
          }"
        >
          <svg
            v-if="statusMessage.type === 'success'"
            class="w-5 h-5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg
            v-else
            class="w-5 h-5 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p
            class="font-medium"
            :class="{
              'text-green-800': statusMessage.type === 'success',
              'text-red-800': statusMessage.type === 'error'
            }"
          >
            {{ statusMessage.text }}
          </p>
        </div>
      </div>

      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Mon profil</h1>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
          Gérez vos informations personnelles et vos préférences de compte
        </p>
      </div>

      <!-- Profile Content -->
      <div class="space-y-8">
        <!-- Personal Information -->
        <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div class="flex items-center space-x-4 mb-8">
            <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-900">Informations personnelles</h2>
              <p class="text-gray-600">Vos données de profil et informations de contact</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Prénom</label>
              <div class="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                <span class="text-gray-900">{{ user.firstName }}</span>
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Nom</label>
              <div class="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                <span class="text-gray-900">{{ user.lastName }}</span>
              </div>
            </div>

            <div class="md:col-span-2">
              <label class="block text-sm font-semibold text-gray-700 mb-2">Adresse email</label>
              <div class="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                <span class="text-gray-900">{{ user.email }}</span>
                <span
                  v-if="user.isEmailVerified"
                  class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Vérifié
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                >
                  <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Non vérifié
                </span>
              </div>
            </div>

            <div class="md:col-span-2">
              <label class="block text-sm font-semibold text-gray-700 mb-2">Membre depuis</label>
              <div class="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                <span class="text-gray-900">{{ formatDate(user.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Account Security -->
        <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div class="flex items-center space-x-4 mb-8">
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-900">Sécurité du compte</h2>
              <p class="text-gray-600">Gérez vos paramètres de sécurité et connexions</p>
            </div>
          </div>

          <div class="space-y-6">
            <!-- Password Management -->
            <div class="p-6 border border-gray-200 rounded-xl">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-semibold text-gray-900">Mot de passe</h3>
                  <p class="text-sm text-gray-600">
                    {{ user.hasPassword ? 'Mot de passe défini' : 'Aucun mot de passe défini' }}
                  </p>
                </div>
                <button
                  @click="showPasswordModal = true"
                  class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  {{ user.hasPassword ? 'Modifier' : 'Définir' }}
                </button>
              </div>
            </div>

            <!-- Google Account -->
            <div class="p-6 border border-gray-200 rounded-xl">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <svg class="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#fbbc04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <div>
                    <h3 class="font-semibold text-gray-900">Compte Google</h3>
                    <p class="text-sm text-gray-600">
                      {{ user.googleId ? 'Lié à votre compte Google' : 'Non lié' }}
                    </p>
                  </div>
                </div>
                <button
                  v-if="!user.googleId"
                  @click="linkGoogleAccount"
                  class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Lier
                </button>
                <span
                  v-else
                  class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Connecté
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Travel Statistics -->
        <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div class="flex items-center space-x-4 mb-8">
            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-900">Statistiques de voyage</h2>
              <p class="text-gray-600">Votre activité sur la plateforme</p>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div class="text-center p-6 bg-gray-50 rounded-xl">
              <div class="text-3xl font-bold text-orange-500 mb-1">0</div>
              <div class="text-sm text-gray-600">Voyages créés</div>
            </div>
            <div class="text-center p-6 bg-gray-50 rounded-xl">
              <div class="text-3xl font-bold text-blue-500 mb-1">0</div>
              <div class="text-sm text-gray-600">Pays visités</div>
            </div>
            <div class="text-center p-6 bg-gray-50 rounded-xl">
              <div class="text-3xl font-bold text-green-500 mb-1">0</div>
              <div class="text-sm text-gray-600">Voyages terminés</div>
            </div>
            <div class="text-center p-6 bg-gray-50 rounded-xl">
              <div class="text-3xl font-bold text-gray-500 mb-1">0</div>
              <div class="text-sm text-gray-600">Jours de voyage</div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Password Modal -->
    <div
      v-if="showPasswordModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click="showPasswordModal = false"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
        @click.stop
      >
        <div class="flex items-center justify-between mb-8">
          <h3 class="text-2xl font-bold text-gray-900">
            {{ user.hasPassword ? 'Modifier le mot de passe' : 'Définir un mot de passe' }}
          </h3>
          <button
            @click="showPasswordModal = false"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handlePasswordSubmit" class="space-y-6">
          <div v-if="user.hasPassword">
            <label class="block text-sm font-semibold text-gray-700 mb-2">Mot de passe actuel</label>
            <input
              v-model="passwordForm.currentPassword"
              type="password"
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Nouveau mot de passe</label>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
            <p class="text-xs text-gray-500 mt-1">Minimum 8 caractères</p>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Confirmer le nouveau mot de passe</label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              :class="{ 'border-red-300 focus:ring-red-500': passwordMismatch }"
            />
            <p v-if="passwordMismatch" class="text-xs text-red-500 mt-1">
              Les mots de passe ne correspondent pas
            </p>
          </div>

          <div v-if="passwordError" class="p-4 rounded-xl bg-red-50 border border-red-200">
            <p class="text-red-600 text-sm">{{ passwordError }}</p>
          </div>

          <div class="flex space-x-3 pt-4">
            <button
              type="button"
              @click="showPasswordModal = false"
              class="flex-1 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              :disabled="isUpdatingPassword"
              class="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isUpdatingPassword" class="inline-flex items-center">
                <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                {{ user.hasPassword ? 'Modification...' : 'Définition...' }}
              </span>
              <span v-else>{{ user.hasPassword ? 'Modifier' : 'Définir' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <AuthLoader v-if="authGuard.isLoading.value" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const authGuard = useAuthGuard()
const authStore = useAuthStore()
const router = useRouter()

const user = computed(() => authStore.user!)

const statusMessage = reactive({
  text: '',
  type: 'success' as 'success' | 'error'
})

// Password modal state
const showPasswordModal = ref(false)
const isUpdatingPassword = ref(false)
const passwordError = ref('')

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const passwordMismatch = computed(() => {
  return passwordForm.newPassword && passwordForm.confirmPassword &&
         passwordForm.newPassword !== passwordForm.confirmPassword
})

const handleLogout = async () => {
  await authStore.logout()
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const linkGoogleAccount = async () => {
  const config = useRuntimeConfig()
  window.location.href = `${config.public.apiBase}/auth/google/link`
}

const handlePasswordSubmit = async () => {
  passwordError.value = ''

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordError.value = 'Les mots de passe ne correspondent pas'
    return
  }

  if (passwordForm.newPassword.length < 8) {
    passwordError.value = 'Le mot de passe doit contenir au moins 8 caractères'
    return
  }

  isUpdatingPassword.value = true

  try {
    const config = useRuntimeConfig()
    const endpoint = user.value.hasPassword ? '/auth/change-password' : '/auth/set-password'

    const body: any = {
      newPassword: passwordForm.newPassword
    }

    if (user.value.hasPassword) {
      body.currentPassword = passwordForm.currentPassword
    }

    await $fetch(endpoint, {
      method: 'POST',
      baseURL: config.public.apiBase,
      headers: {
        'Authorization': `Bearer ${authStore.accessToken}`
      },
      body
    })

    showPasswordModal.value = false
    await authStore.fetchProfile()
    showStatusMessage(
      user.value.hasPassword ? 'Mot de passe modifié avec succès !' : 'Mot de passe défini avec succès !',
      'success'
    )

    // Reset form
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''

  } catch (err: any) {
    console.error('Password update error:', err)
    passwordError.value = err.data?.message || 'Erreur lors de la mise à jour du mot de passe'
  } finally {
    isUpdatingPassword.value = false
  }
}

const showStatusMessage = (text: string, type: 'success' | 'error') => {
  statusMessage.text = text
  statusMessage.type = type
  setTimeout(() => {
    statusMessage.text = ''
  }, 3000)
}

onMounted(() => {
  const route = useRoute()
  const linkStatus = route.query.link

  if (linkStatus === 'success') {
    showStatusMessage('Compte Google lié avec succès !', 'success')
    router.replace({ query: {} })
  } else if (linkStatus === 'email_mismatch') {
    showStatusMessage('L\'email de votre compte Google doit correspondre à l\'email de votre compte local', 'error')
    router.replace({ query: {} })
  } else if (linkStatus === 'error') {
    showStatusMessage('Erreur lors de la liaison du compte Google', 'error')
    router.replace({ query: {} })
  }
})
</script>