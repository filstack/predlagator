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
          // Backend возвращает: { user: {...}, session: { access_token, ... } }
          const response = await apiClient.post<{
            user: any;
            session: { access_token: string; refresh_token: string }
          }>(
            '/auth/login',
            credentials
          )

          // Сохраняем access_token из Supabase session
          apiClient.setToken(response.session.access_token)

          // Преобразуем Supabase user в наш формат
          const user: User = {
            userId: response.user.id,
            username: response.user.email.split('@')[0], // Используем часть email как username
            role: 'OPERATOR', // Default role
          }

          set({
            user,
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
          // Backend возвращает: { user: {...}, session: { access_token, ... } }
          const response = await apiClient.post<{
            user: any;
            session: { access_token: string; refresh_token: string }
          }>(
            '/auth/register',
            data
          )

          // Сохраняем access_token из Supabase session
          apiClient.setToken(response.session.access_token)

          // Преобразуем Supabase user в наш формат
          const user: User = {
            userId: response.user.id,
            username: data.username || response.user.email.split('@')[0],
            role: data.role || 'OPERATOR',
          }

          set({
            user,
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
          set({ isAuthenticated: false, user: null, isLoading: false })
          return
        }

        set({ isLoading: true })
        try {
          // Backend возвращает: { user: {...}, profile: { id, username, email, role, ... } }
          const response = await apiClient.get<{
            user: any;
            profile: { id: string; username?: string; email?: string; role?: string } | null
          }>('/auth/me')

          // Преобразуем в наш формат
          const user: User = {
            userId: response.user.id,
            username: response.profile?.username || response.user.email?.split('@')[0] || 'User',
            role: response.profile?.role || 'OPERATOR',
          }

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
