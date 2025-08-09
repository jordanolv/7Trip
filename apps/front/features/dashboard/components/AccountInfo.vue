<template>
  <div class="bg-white overflow-hidden shadow rounded-lg mb-6">
    <div class="px-4 py-5 sm:p-6">
      <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
        Informations du compte
      </h3>
      <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
        <div>
          <dt class="text-sm font-medium text-gray-500">Email</dt>
          <dd class="mt-1 text-sm text-gray-900">{{ user.email }}</dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500">Nom complet</dt>
          <dd class="mt-1 text-sm text-gray-900">{{ user.firstName }} {{ user.lastName }}</dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500">Méthode de connexion</dt>
          <dd class="mt-1 text-sm text-gray-900 flex items-center">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="user.provider === 'google' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'">
              {{ user.provider === 'google' ? 'Google OAuth' : 'Email/Mot de passe' }}
            </span>
          </dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500">Rôle</dt>
          <dd class="mt-1 text-sm text-gray-900">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {{ user.role }}
            </span>
          </dd>
        </div>
      </dl>
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