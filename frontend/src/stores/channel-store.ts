// frontend/src/stores/channel-store.ts
import { create } from 'zustand'
import { apiClient } from '../lib/api-client'
import type {
  Channel,
  CreateChannelRequest,
  UpdateChannelRequest,
  ListChannelsQuery,
  ListChannelsResponse,
  CheckUsernameResponse,
} from '../types/channel'

interface ChannelState {
  channels: Channel[]
  selectedChannel: Channel | null
  totalCount: number
  currentPage: number
  isLoading: boolean
  error: string | null

  // Actions
  fetchChannels: (query?: ListChannelsQuery) => Promise<void>
  createChannel: (data: CreateChannelRequest) => Promise<Channel>
  updateChannel: (id: string, data: UpdateChannelRequest) => Promise<Channel>
  deleteChannel: (id: string) => Promise<void>
  selectChannel: (channel: Channel | null) => void
  checkUsernameAvailability: (username: string, excludeChannelId?: string) => Promise<CheckUsernameResponse>
  clearError: () => void
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  selectedChannel: null,
  totalCount: 0,
  currentPage: 1,
  isLoading: false,
  error: null,

  fetchChannels: async (query?: ListChannelsQuery) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get<ListChannelsResponse>('/channels', query)
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

  createChannel: async (data: CreateChannelRequest) => {
    set({ isLoading: true, error: null })
    try {
      const channel = await apiClient.post<Channel>('/channels', data)
      set((state) => ({
        channels: [channel, ...state.channels],
        totalCount: state.totalCount + 1,
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

  updateChannel: async (id: string, data: UpdateChannelRequest) => {
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

  checkUsernameAvailability: async (username: string, excludeChannelId?: string) => {
    try {
      const params = excludeChannelId ? { exclude_channel_id: excludeChannelId } : {}
      const response = await apiClient.get<CheckUsernameResponse>(
        `/channels/check-username/${encodeURIComponent(username)}`,
        params
      )
      return response
    } catch (error: any) {
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))
