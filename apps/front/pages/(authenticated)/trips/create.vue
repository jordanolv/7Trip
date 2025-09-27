<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Navigation simple -->
    <nav class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <NuxtLink to="/" class="text-2xl font-bold text-blue-600">7Trip.co</NuxtLink>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-gray-700">{{ user?.firstName }}</span>
            <NuxtLink to="/profil" class="text-gray-600 hover:text-gray-900">Mon profil</NuxtLink>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Créer un nouveau voyage</h1>
        <p class="text-gray-600">Planifiez votre prochaine aventure en quelques étapes simples</p>
      </div>

      <!-- Form -->
      <div class="bg-white rounded-2xl shadow-sm border p-8">
        <form @submit.prevent="handleCreateTrip" class="space-y-8">
          <!-- Informations de base -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="space-y-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-4">Informations générales</h2>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Titre du voyage *
                </label>
                <input
                  v-model="form.title"
                  type="text"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Découverte de l'Italie"
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  v-model="form.description"
                  rows="4"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Décrivez votre voyage, vos attentes, ce que vous prévoyez de faire..."
                ></textarea>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Date de début *
                  </label>
                  <input
                    v-model="form.startDate"
                    type="date"
                    required
                    :min="today"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin *
                  </label>
                  <input
                    v-model="form.endDate"
                    type="date"
                    required
                    :min="form.startDate || today"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                </div>
              </div>
            </div>

            <div class="space-y-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-4">Paramètres</h2>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Image de couverture
                </label>
                <input
                  v-model="form.coverImage"
                  type="url"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://exemple.com/image.jpg"
                >
                <p class="text-sm text-gray-500 mt-1">URL d'une image pour illustrer votre voyage</p>
              </div>

              <div class="space-y-4">
                <h3 class="text-lg font-medium text-gray-900">Visibilité</h3>

                <div class="space-y-3">
                  <label class="flex items-start">
                    <input
                      v-model="form.isPublic"
                      :value="false"
                      type="radio"
                      name="visibility"
                      class="mt-1 text-blue-600 focus:ring-blue-500"
                    >
                    <div class="ml-3">
                      <div class="text-sm font-medium text-gray-900">Privé</div>
                      <div class="text-sm text-gray-500">Seuls vous et les personnes invitées peuvent voir ce voyage</div>
                    </div>
                  </label>

                  <label class="flex items-start">
                    <input
                      v-model="form.isPublic"
                      :value="true"
                      type="radio"
                      name="visibility"
                      class="mt-1 text-blue-600 focus:ring-blue-500"
                    >
                    <div class="ml-3">
                      <div class="text-sm font-medium text-gray-900">Public</div>
                      <div class="text-sm text-gray-500">Visible par tous les utilisateurs sur la page d'accueil</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Statut initial
                </label>
                <select
                  v-model="form.status"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="draft">Brouillon</option>
                  <option value="planned">Planifié</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Error message -->
          <div v-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-red-600">{{ error }}</p>
          </div>

          <!-- Actions -->
          <div class="flex justify-between pt-6 border-t">
            <NuxtLink
              to="/"
              class="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Annuler
            </NuxtLink>

            <button
              type="submit"
              :disabled="isLoading"
              class="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isLoading" class="inline-flex items-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Création...
              </span>
              <span v-else>Créer le voyage</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">

definePageMeta({
  layout: false
})

const authStore = useAuthStore()
const router = useRouter()

const user = computed(() => authStore.user)
const isLoading = ref(false)
const error = ref('')

// Current date for min attribute
const today = new Date().toISOString().split('T')[0]

// Form data
const form = reactive({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  coverImage: '',
  isPublic: false,
  status: 'draft'
})

const handleCreateTrip = async () => {
  error.value = ''
  isLoading.value = true

  try {
    const config = useRuntimeConfig()

    const data = await $fetch('/trips', {
      method: 'POST',
      baseURL: config.public.apiBase,
      headers: {
        'Authorization': `Bearer ${authStore.accessToken}`
      },
      body: form
    })

    console.log('Trip created:', data)

    // Redirect to trip detail or home
    router.push('/')

  } catch (err: any) {
    console.error('Error creating trip:', err)
    error.value = err.data?.message || err.message || 'Erreur lors de la création du voyage'
  } finally {
    isLoading.value = false
  }
}
</script>