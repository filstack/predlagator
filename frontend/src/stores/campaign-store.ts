// frontend/src/stores/campaign-store.ts
import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'
import type {
  Campaign,
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignQuery,
  CampaignAction,
} from '@shared/schemas'

interface CampaignState {
  campaigns: Campaign[]
  selectedCampaign: Campaign | null
  totalCount: number
  currentPage: number
  isLoading: boolean
  error: string | null

  // Actions
  fetchCampaigns: (query?: CampaignQuery) => Promise<void>
  createCampaign: (data: CreateCampaignInput) => Promise<Campaign>
  updateCampaign: (id: string, data: UpdateCampaignInput) => Promise<Campaign>
  deleteCampaign: (id: string) => Promise<void>
  executeCampaignAction: (id: string, action: CampaignAction) => Promise<void>
  selectCampaign: (campaign: Campaign | null) => void
  clearError: () => void
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  campaigns: [],
  selectedCampaign: null,
  totalCount: 0,
  currentPage: 1,
  isLoading: false,
  error: null,

  fetchCampaigns: async (query?: CampaignQuery) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get<{
        data: Campaign[]
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
        }
      }>('/campaigns', query)
      set({
        campaigns: response.data || [],
        totalCount: response.pagination?.total || 0,
        currentPage: response.pagination?.page || 1,
        isLoading: false,
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to fetch campaigns',
        isLoading: false,
        campaigns: [],
      })
    }
  },

  createCampaign: async (data: CreateCampaignInput) => {
    set({ isLoading: true, error: null })
    try {
      const campaign = await apiClient.post<Campaign>('/campaigns', data)
      set((state) => ({
        campaigns: [campaign, ...state.campaigns],
        isLoading: false,
      }))
      return campaign
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to create campaign',
        isLoading: false,
      })
      throw error
    }
  },

  updateCampaign: async (id: string, data: UpdateCampaignInput) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await apiClient.put<Campaign>(`/campaigns/${id}`, data)
      set((state) => ({
        campaigns: state.campaigns.map((c) => (c.id === id ? updated : c)),
        selectedCampaign:
          state.selectedCampaign?.id === id ? updated : state.selectedCampaign,
        isLoading: false,
      }))
      return updated
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to update campaign',
        isLoading: false,
      })
      throw error
    }
  },

  deleteCampaign: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await apiClient.delete(`/campaigns/${id}`)
      set((state) => ({
        campaigns: state.campaigns.filter((c) => c.id !== id),
        selectedCampaign:
          state.selectedCampaign?.id === id ? null : state.selectedCampaign,
        isLoading: false,
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to delete campaign',
        isLoading: false,
      })
      throw error
    }
  },

  executeCampaignAction: async (id: string, action: CampaignAction) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await apiClient.post<Campaign>(
        `/campaigns/${id}/action`,
        action
      )
      set((state) => ({
        campaigns: state.campaigns.map((c) => (c.id === id ? updated : c)),
        selectedCampaign:
          state.selectedCampaign?.id === id ? updated : state.selectedCampaign,
        isLoading: false,
      }))
    } catch (error: any) {
      set({
        error:
          error.response?.data?.error || `Failed to ${action.action} campaign`,
        isLoading: false,
      })
      throw error
    }
  },

  selectCampaign: (campaign: Campaign | null) => {
    set({ selectedCampaign: campaign })
  },

  clearError: () => set({ error: null }),
}))
