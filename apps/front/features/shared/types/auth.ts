export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  profilePicture?: string
  role: 'user' | 'admin'
  provider: 'local' | 'google'
  googleId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  firstName: string
  lastName: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}