// frontend/src/lib/api-client.ts
import axios from 'axios'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types
export interface Channel {
  id: string
  username: string
  category: string
  tgstatUrl?: string | null
  collectedAt: string
  createdAt: string
  updatedAt: string
  title?: string | null
  description?: string | null
  memberCount?: number | null
  isVerified: boolean
  lastChecked?: string | null
  isActive: boolean
  errorCount: number
  lastError?: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface ChannelQuery {
  category?: string
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}

// API functions
export const channelsApi = {
  list: (params?: ChannelQuery) =>
    apiClient.get<PaginatedResponse<Channel>>('/api/channels', { params }),

  getById: (id: string) => apiClient.get<Channel>(`/api/channels/${id}`),

  getCategories: () =>
    apiClient.get<Array<{ name: string; count: number }>>(
      '/api/channels/meta/categories'
    ),
}

export default apiClient
