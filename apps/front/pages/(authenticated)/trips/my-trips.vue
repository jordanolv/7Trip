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
            <NuxtLink
              to="/trips/create"
              class="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              + Créer un voyage
            </NuxtLink>
            <UserMenu :user="user" @logout="handleLogout" />
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Mes voyages</h1>
        <p class="text-gray-600">Gérez et organisez tous vos voyages</p>
      </div>

      <!-- Trips Grid -->
      <div v-if="trips.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="trip in trips"
          :key="trip.id"
          class="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
        >
          <div class="h-48 bg-gradient-to-br from-blue-400 to-purple-500 rounded-t-xl relative">
            <img
              v-if="trip.coverImage"
              :src="trip.coverImage"
              :alt="trip.title"
              class="w-full h-full object-cover rounded-t-xl"
            >
            <div class="absolute top-4 left-4">
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="getStatusBadge(trip.status)"
              >
                {{ getStatusLabel(trip.status) }}
              </span>
            </div>
          </div>
          <div class="p-6">
            <h3 class="text-xl font-semibold text-gray-900 mb-2">{{ trip.title }}</h3>
            <p class="text-gray-600 mb-3 line-clamp-2">{{ trip.description }}</p>
            <div class="flex items-center justify-between text-sm text-gray-500">
              <span>{{ formatDateRange(trip.startDate, trip.endDate) }}</span>
              <span v-if="trip.isPublic" class="text-green-600">Public</span>
              <span v-else class="text-gray-500">Privé</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Aucun voyage</h3>
        <p class="mt-1 text-sm text-gray-500">Commencez par créer votre premier voyage.</p>
        <div class="mt-6">
          <NuxtLink
            to="/trips/create"
            class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            + Créer un voyage
          </NuxtLink>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-12">
        <div class="inline-flex items-center space-x-2">
          <svg class="animate-spin h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span class="text-gray-600">Chargement...</span>
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
const trips = ref([])
const isLoading = ref(true)

const handleLogout = async () => {
  await authStore.logout()
}

const getStatusLabel = (status: string) => {
  const labels = {
    draft: 'Brouillon',
    planned: 'Planifié',
    ongoing: 'En cours',
    completed: 'Terminé'
  }
  return labels[status] || status
}

const getStatusBadge = (status: string) => {
  const badges = {
    draft: 'bg-gray-100 text-gray-800',
    planned: 'bg-blue-100 text-blue-800',
    ongoing: 'bg-green-100 text-green-800',
    completed: 'bg-purple-100 text-purple-800'
  }
  return badges[status] || 'bg-gray-100 text-gray-800'
}

const formatDateRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  })
  const end = new Date(endDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  })
  return `${start} - ${end}`
}

// Load user trips
onMounted(async () => {
  try {
    const config = useRuntimeConfig()

    const data = await $fetch('/trips/my-trips', {
      baseURL: config.public.apiBase,
      headers: {
        'Authorization': `Bearer ${authStore.accessToken}`
      }
    })

    trips.value = data
  } catch (error) {
    console.error('Error loading trips:', error)
  } finally {
    isLoading.value = false
  }
})
</script>