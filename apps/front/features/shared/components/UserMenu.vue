<template>
  <div class="relative">
    <!-- User Button -->
    <button
      @click="toggleDropdown"
      class="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors p-2 rounded-xl hover:bg-gray-100"
    >
      <!-- Avatar -->
      <div class="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
        <img
          v-if="user?.profilePicture"
          :src="user.profilePicture"
          :alt="userDisplayName"
          class="w-10 h-10 rounded-full object-cover"
        >
        <span v-else class="text-sm font-bold text-white">
          {{ initials }}
        </span>
      </div>

      <!-- Name -->
      <span class="hidden sm:block text-sm font-medium">{{ user?.firstName }}</span>

      <!-- Chevron -->
      <svg
        class="w-4 h-4 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50"
      >
        <!-- User Info Header -->
        <div class="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-5 border-b border-gray-200">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
              <img
                v-if="user?.profilePicture"
                :src="user.profilePicture"
                :alt="userDisplayName"
                class="w-12 h-12 rounded-full object-cover"
              >
              <span v-else class="text-lg font-bold text-white">
                {{ initials }}
              </span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ userDisplayName }}</p>
              <p class="text-xs text-gray-600 truncate">{{ user?.email }}</p>
            </div>
          </div>
        </div>

        <!-- Menu Items -->
        <div class="py-3">
          <NuxtLink
            to="/profil"
            @click="closeDropdown"
            class="flex items-center px-6 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
          >
            <div class="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center mr-3 group-hover:bg-orange-200 transition-colors">
              <svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <div class="font-medium text-gray-900">Mon profil</div>
              <div class="text-xs text-gray-500">Gérer mes informations</div>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/trips/my-trips"
            @click="closeDropdown"
            class="flex items-center px-6 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
          >
            <div class="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <div class="font-medium text-gray-900">Mes voyages</div>
              <div class="text-xs text-gray-500">Voir tous mes voyages</div>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/trips/create"
            @click="closeDropdown"
            class="flex items-center px-6 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
          >
            <div class="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center mr-3 group-hover:bg-green-200 transition-colors">
              <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <div class="font-medium text-gray-900">Nouveau voyage</div>
              <div class="text-xs text-gray-500">Planifier une aventure</div>
            </div>
          </NuxtLink>

          <hr class="my-3 border-gray-200">

          <button
            @click="handleLogout"
            class="w-full flex items-center px-6 py-3 text-sm text-gray-700 hover:bg-red-50 transition-colors text-left group"
          >
            <div class="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center mr-3 group-hover:bg-red-100 transition-colors">
              <svg class="w-4 h-4 text-gray-600 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div>
              <div class="font-medium text-gray-900 group-hover:text-red-700">Se déconnecter</div>
              <div class="text-xs text-gray-500">Quitter mon compte</div>
            </div>
          </button>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div class="flex items-center justify-between">
            <div class="text-xs text-gray-500 font-medium">7Trip.co</div>
            <div class="text-xs text-gray-400">v1.0</div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Backdrop -->
    <div
      v-if="isOpen"
      @click="closeDropdown"
      class="fixed inset-0 z-40"
    ></div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  user: {
    firstName: string
    lastName?: string
    email: string
    profilePicture?: string
  } | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  logout: []
}>()

const isOpen = ref(false)

const userDisplayName = computed(() => {
  if (!props.user) return ''
  return `${props.user.firstName} ${props.user.lastName || ''}`.trim()
})

const initials = computed(() => {
  if (!props.user) return ''
  const first = props.user.firstName?.[0] || ''
  const last = props.user.lastName?.[0] || ''
  return (first + last).toUpperCase()
})

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const closeDropdown = () => {
  isOpen.value = false
}

const handleLogout = () => {
  closeDropdown()
  emit('logout')
}

// Close dropdown on escape key
onKeyStroke('Escape', () => {
  isOpen.value = false
})
</script>