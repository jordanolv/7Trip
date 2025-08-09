import { defineStore } from 'pinia'
import { jwtDecode } from 'jwt-decode'
import type { User, LoginCredentials, RegisterData, AuthResponse } from '~/features/shared/types/auth'

interface JwtPayload {
  sub: number
  email: string
  role: string
  exp: number
}

export const useAuthStore = defineStore('auth', () => {
  const config = useRuntimeConfig()
  
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const isLoading = ref(false)
  const isInitialized = ref(false)

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const setTokens = (access: string, refresh: string) => {
    accessToken.value = access
    refreshToken.value = refresh
    
    try {
      const decoded = jwtDecode<JwtPayload>(access)
    } catch (error) {
      console.error('Invalid token:', error)
    }
  }

  const login = async (credentials: LoginCredentials) => {
    isLoading.value = true
    try {
      const data = await $fetch<{
        accessToken: string
        refreshToken: string
        user: User
      }>('/auth/login', {
        method: 'POST',
        baseURL: config.public.apiBase,
        body: credentials
      })

      setTokens(data.accessToken, data.refreshToken)
      user.value = data.user
      
      if (process.client) {
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
      }

      return data
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const register = async (userData: RegisterData) => {
    isLoading.value = true
    try {
      const data = await $fetch<{
        accessToken: string
        refreshToken: string
        user: User
      }>('/auth/register', {
        method: 'POST',
        baseURL: config.public.apiBase,
        body: userData
      })

      setTokens(data.accessToken, data.refreshToken)
      user.value = data.user
      
      if (process.client) {
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
      }

      return data
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const fetchProfile = async () => {
    if (!accessToken.value) return null

    try {
      const profile = await $fetch<User>('/auth/profile', {
        baseURL: config.public.apiBase,
        headers: {
          Authorization: `Bearer ${accessToken.value}`
        }
      })

      user.value = profile
      return profile
    } catch (error: any) {
      console.error('Failed to fetch profile:', error)
      
      if (error.status === 401) {
        logout()
      }
      
      return null
    }
  }

  const logout = async () => {
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    
    if (process.client) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
    }
  }

  const initAuth = async () => {
    if (process.client && !isInitialized.value) {
      const savedAccessToken = localStorage.getItem('accessToken')
      const savedRefreshToken = localStorage.getItem('refreshToken')
      
      if (savedAccessToken && savedRefreshToken) {
        accessToken.value = savedAccessToken
        refreshToken.value = savedRefreshToken
        await fetchProfile()
      }
      
      isInitialized.value = true
    }
  }

  const setPassword = async (password: string) => {
    if (!accessToken.value) throw new Error('Not authenticated')

    try {
      await $fetch('/auth/set-password', {
        method: 'POST',
        baseURL: config.public.apiBase,
        headers: {
          Authorization: `Bearer ${accessToken.value}`
        },
        body: { password }
      })

      await fetchProfile()
    } catch (error) {
      throw error
    }
  }

  return {
    // State
    user: readonly(user),
    accessToken: readonly(accessToken),
    isLoading: readonly(isLoading),
    isInitialized: readonly(isInitialized),
    
    // Getters
    isAuthenticated,
    isAdmin,
    
    // Actions
    login,
    register,
    logout,
    fetchProfile,
    initAuth,
    setPassword,
    setTokens,
  }
})