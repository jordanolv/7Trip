<template>
  <div class="border rounded-lg p-4">
    <div class="flex items-center justify-between">
      <div>
        <h4 class="text-sm font-medium text-gray-900 mb-1">
          Mot de passe local
        </h4>
        <p class="text-sm text-gray-600">
          Définissez ou modifiez votre mot de passe pour vous connecter avec votre email.
        </p>
      </div>
      <BaseButton variant="secondary" size="sm" @click="showModal = true">
        Changer
      </BaseButton>
    </div>

    <BaseModal v-model="showModal" title="Changer le mot de passe">
      <div class="space-y-4">
        <BaseInput
          v-model="form.password"
          type="password"
          label="Nouveau mot de passe"
          placeholder="Minimum 6 caractères"
        />
        
        <BaseInput
          v-model="form.confirmPassword"
          type="password"
          label="Confirmer le mot de passe"
          placeholder="Répétez le mot de passe"
          :error="form.password && form.confirmPassword && form.password !== form.confirmPassword ? 'Les mots de passe ne correspondent pas' : ''"
        />
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="showModal = false">
          Annuler
        </BaseButton>
        <BaseButton 
          :disabled="!canSubmit"
          :loading="isLoading"
          @click="handleSubmit"
        >
          Confirmer
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore()

const showModal = ref(false)
const isLoading = ref(false)

const form = reactive({
  password: '',
  confirmPassword: ''
})

const canSubmit = computed(() => 
  form.password.length >= 6 && 
  form.password === form.confirmPassword
)

const emit = defineEmits<{
  passwordChanged: []
}>()

const handleSubmit = async () => {
  if (!canSubmit.value) return

  isLoading.value = true
  try {
    await authStore.setPassword(form.password)
    form.password = ''
    form.confirmPassword = ''
    showModal.value = false
    emit('passwordChanged')
  } catch (error) {
    console.error('Password change error:', error)
  } finally {
    isLoading.value = false
  }
}
</script>