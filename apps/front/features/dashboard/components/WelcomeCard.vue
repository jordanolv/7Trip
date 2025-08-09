<template>
  <div class="bg-white overflow-hidden shadow rounded-lg mb-6">
    <div class="px-4 py-5 sm:p-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">
        Bienvenue, {{ user.firstName }} !
      </h2>
      <p class="text-gray-600">
        Voici votre tableau de bord personnel.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { User } from '~/features/shared/types/auth'

interface Props {
  user: User
}

defineProps<Props>()
</script>