// frontend/src/stores/channel-store.ts
import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'
import type {
  Channel,
  CreateChannelInput,
  ChannelQuery,
} from '@shared/schemas'

interface ChannelState {
  channels: Channel[]
  selectedChannel: Channel | null
  totalCount: number
  currentPage: number
  isLoading: boolean
  error: string | null

  // Actions
  fetchChannels: (query?: ChannelQuery) => Promise<void>
  createChannel: (data: CreateChannelInput) => Promise<Channel>
  updateChannel: (id: string, data: Partial<Channel>) => Promise<Channel>
  deleteChannel: (id: string) => Promise<void>
  selectChannel: (channel: Channel | null) => void
  clearError: () => void
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  selectedChannel: null,
  totalCount: 0,
  currentPage: 1,
  isLoading: false,
  error: null,

  fetchChannels: async (query?: ChannelQuery) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get<{
        data: Channel[]
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
        }
      }>('/channels', query)
      set({
        channels: response.data || [],
        totalCount: response.pagination?.total || 0,
        currentPage: response.pagination?.page || 1,
        isLoading: false,
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to fetch channels',
        isLoading: false,
        channels: [],
      })
    }
  },

  createChannel: async (data: CreateChannelInput) => {
    set({ isLoading: true, error: null })
    try {
      const channel = await apiClient.post<Channel>('/channels', data)
      set((state) => ({
        channels: [channel, ...state.channels],
        isLoading: false,
      }))
      return channel
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to create channel',
        isLoading: false,
      })
      throw error
    }
  },

  updateChannel: async (id: string, data: Partial<Channel>) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await apiClient.put<Channel>(`/channels/${id}`, data)
      set((state) => ({
        channels: state.channels.map((ch) => (ch.id === id ? updated : ch)),
        selectedChannel:
          state.selectedChannel?.id === id ? updated : state.selectedChannel,
        isLoading: false,
      }))
      return updated
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to update channel',
        isLoading: false,
      })
      throw error
    }
  },

  deleteChannel: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await apiClient.delete(`/channels/${id}`)
      set((state) => ({
        channels: state.channels.filter((ch) => ch.id !== id),
        selectedChannel:
          state.selectedChannel?.id === id ? null : state.selectedChannel,
        isLoading: false,
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to delete channel',
        isLoading: false,
      })
      throw error
    }
  },

  selectChannel: (channel: Channel | null) => {
    set({ selectedChannel: channel })
  },

  clearError: () => set({ error: null }),
}))
