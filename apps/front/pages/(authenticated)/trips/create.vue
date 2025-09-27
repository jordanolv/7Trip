<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Navigation -->
    <nav class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <NuxtLink to="/" class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <span class="text-white font-bold text-lg">7</span>
            </div>
            <span class="text-xl font-bold text-gray-900">Trip.co</span>
          </NuxtLink>

          <div class="flex items-center space-x-4">
            <span class="text-gray-600 font-medium">{{ user?.firstName }}</span>
            <NuxtLink
              to="/profil"
              class="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Mon profil
            </NuxtLink>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Créer un nouveau voyage</h1>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
          Planifiez votre prochaine aventure et partagez-la avec la communauté
        </p>
      </div>

      <!-- Form Container -->
      <div class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <form @submit.prevent="handleCreateTrip" class="p-8 space-y-8">
          <!-- Basic Information Section -->
          <div class="space-y-6">
            <div class="text-center">
              <div class="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Informations du voyage</h2>
              <p class="text-gray-600">Décrivez votre prochaine aventure</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div class="lg:col-span-2">
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Titre du voyage
                </label>
                <input
                  v-model="form.title"
                  type="text"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-lg"
                  placeholder="Ex: Découverte magique de l'Italie"
                />
              </div>

              <div class="lg:col-span-2">
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Description de votre voyage
                </label>
                <textarea
                  v-model="form.description"
                  rows="4"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none transition-all"
                  placeholder="Décrivez votre voyage, vos attentes, les activités prévues, les lieux que vous souhaitez découvrir..."
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Date de début
                </label>
                <input
                  v-model="form.startDate"
                  type="date"
                  required
                  :min="today"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Date de fin
                </label>
                <input
                  v-model="form.endDate"
                  type="date"
                  required
                  :min="form.startDate || today"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          <!-- Divider -->
          <div class="border-t border-gray-200"></div>

          <!-- Advanced Settings -->
          <div class="space-y-6">
            <div class="text-center">
              <div class="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Paramètres</h2>
              <p class="text-gray-600">Personnalisez votre voyage</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Image de couverture
                </label>
                <input
                  v-model="form.coverImage"
                  type="url"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="https://exemple.com/belle-image.jpg"
                />
                <p class="text-xs text-gray-500 mt-1">URL d'une image pour illustrer votre voyage</p>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Statut initial
                </label>
                <select
                  v-model="form.status"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                >
                  <option value="draft">🗒️ Brouillon - Je continue à planifier</option>
                  <option value="planned">✈️ Planifié - Prêt pour l'aventure</option>
                </select>
              </div>
            </div>

            <!-- Visibility Settings -->
            <div>
              <h3 class="text-lg font-bold text-gray-900 mb-4 text-center">Visibilité du voyage</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Private Option -->
                <div
                  class="border-2 rounded-xl p-4 cursor-pointer transition-all"
                  :class="!form.isPublic ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'"
                  @click="form.isPublic = false"
                >
                  <label class="flex items-start cursor-pointer">
                    <input
                      v-model="form.isPublic"
                      :value="false"
                      type="radio"
                      name="visibility"
                      class="mt-1 text-orange-500 focus:ring-orange-500"
                    >
                    <div class="ml-3">
                      <div class="flex items-center space-x-2">
                        <span class="text-lg">🔒</span>
                        <span class="font-semibold text-gray-900">Voyage privé</span>
                      </div>
                      <p class="text-sm text-gray-600 mt-1">
                        Seuls vous et les personnes invitées peuvent voir ce voyage
                      </p>
                    </div>
                  </label>
                </div>

                <!-- Public Option -->
                <div
                  class="border-2 rounded-xl p-4 cursor-pointer transition-all"
                  :class="form.isPublic ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'"
                  @click="form.isPublic = true"
                >
                  <label class="flex items-start cursor-pointer">
                    <input
                      v-model="form.isPublic"
                      :value="true"
                      type="radio"
                      name="visibility"
                      class="mt-1 text-orange-500 focus:ring-orange-500"
                    >
                    <div class="ml-3">
                      <div class="flex items-center space-x-2">
                        <span class="text-lg">🌍</span>
                        <span class="font-semibold text-gray-900">Voyage public</span>
                      </div>
                      <p class="text-sm text-gray-600 mt-1">
                        Visible par la communauté et partageable
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Error message -->
          <div v-if="error" class="p-4 rounded-xl bg-red-50 border border-red-200">
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-red-600 font-semibold">{{ error }}</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row sm:justify-between gap-4 pt-6 border-t border-gray-200">
            <NuxtLink
              to="/"
              class="inline-flex items-center justify-center px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Annuler
            </NuxtLink>

            <button
              type="submit"
              :disabled="isLoading"
              class="inline-flex items-center justify-center px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              {{ isLoading ? 'Création en cours...' : 'Créer mon voyage' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Info Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div class="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="font-bold text-gray-900 mb-2">Facile à organiser</h3>
          <p class="text-sm text-gray-600">Planifiez votre voyage en quelques minutes seulement</p>
        </div>

        <div class="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 class="font-bold text-gray-900 mb-2">Partagez vos aventures</h3>
          <p class="text-sm text-gray-600">Inspirez la communauté avec vos découvertes</p>
        </div>

        <div class="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 class="font-bold text-gray-900 mb-2">Souvenirs durables</h3>
          <p class="text-sm text-gray-600">Gardez une trace de tous vos voyages mémorables</p>
        </div>
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