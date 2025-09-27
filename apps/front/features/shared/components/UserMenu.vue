<template>
  <div class="relative">
    <!-- User Button -->
    <button
      @click="toggleDropdown"
      class="flex items-center space-x-3 text-white hover:text-white/80 transition-colors"
    >
      <!-- Avatar -->
      <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
        <img
          v-if="user?.profilePicture"
          :src="user.profilePicture"
          :alt="user.fullName"
          class="w-8 h-8 rounded-full object-cover"
        >
        <span v-else class="text-sm font-medium text-white">
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
        class="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-white/20 py-2"
      >
        <!-- User Info -->
        <div class="px-4 py-2 border-b border-gray-200/50">
          <p class="text-sm font-medium text-gray-900">{{ user?.fullName }}</p>
          <p class="text-xs text-gray-500">{{ user?.email }}</p>
        </div>

        <!-- Menu Items -->
        <div class="py-1">
          <NuxtLink
            to="/profil"
            @click="closeDropdown"
            class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100/50 transition-colors"
          >
            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Mon profil
          </NuxtLink>

          <NuxtLink
            to="/trips/my-trips"
            @click="closeDropdown"
            class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100/50 transition-colors"
          >
            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Mes voyages
          </NuxtLink>

          <hr class="my-1 border-gray-200/50">

          <button
            @click="handleLogout"
            class="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100/50 transition-colors text-left"
          >
            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Se déconnecter
          </button>
        </div>
      </div>
    </Transition>

    <!-- Backdrop -->
    <div
      v-if="isOpen"
      @click="closeDropdown"
      class="fixed inset-0 z-[-1]"
    ></div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  user: {
    firstName: string
    lastName?: string
    fullName: string
    email: string
    profilePicture?: string
  } | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  logout: []
}>()

const isOpen = ref(false)

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