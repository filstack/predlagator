// frontend/src/stores/auth-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '@/lib/api-client'
import type { LoginInput, RegisterInput } from '@shared/schemas'

interface User {
  userId: string
  username: string
  role: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (credentials: LoginInput) => Promise<void>
  register: (data: RegisterInput) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginInput) => {
        set({ isLoading: true, error: null })
        try {
          const response = await apiClient.post<{ token: string; user: User }>(
            '/auth/login',
            credentials
          )
          apiClient.setToken(response.token)
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Login failed',
            isLoading: false,
          })
          throw error
        }
      },

      register: async (data: RegisterInput) => {
        set({ isLoading: true, error: null })
        try {
          const response = await apiClient.post<{ token: string; user: User }>(
            '/auth/register',
            data
          )
          apiClient.setToken(response.token)
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Registration failed',
            isLoading: false,
          })
          throw error
        }
      },

      logout: () => {
        apiClient.removeToken()
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        })
      },

      checkAuth: async () => {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          set({ isAuthenticated: false, user: null })
          return
        }

        set({ isLoading: true })
        try {
          const user = await apiClient.get<User>('/auth/me')
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          apiClient.removeToken()
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
