// frontend/src/stores/batch-store.ts
import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'
import type {
  Batch,
  CreateBatchInput,
  UpdateBatchInput,
  BatchQuery,
} from '@shared/schemas'

interface BatchState {
  batches: Batch[]
  selectedBatch: Batch | null
  totalCount: number
  currentPage: number
  isLoading: boolean
  error: string | null

  // Actions
  fetchBatches: (query?: BatchQuery) => Promise<void>
  createBatch: (data: CreateBatchInput) => Promise<Batch>
  updateBatch: (id: string, data: UpdateBatchInput) => Promise<Batch>
  deleteBatch: (id: string) => Promise<void>
  selectBatch: (batch: Batch | null) => void
  clearError: () => void
}

export const useBatchStore = create<BatchState>((set, get) => ({
  batches: [],
  selectedBatch: null,
  totalCount: 0,
  currentPage: 1,
  isLoading: false,
  error: null,

  fetchBatches: async (query?: BatchQuery) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get<{
        data: Batch[]
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
        }
      }>('/batches', query)
      set({
        batches: response.data || [],
        totalCount: response.pagination?.total || 0,
        currentPage: response.pagination?.page || 1,
        isLoading: false,
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to fetch batches',
        isLoading: false,
        batches: [],
      })
    }
  },

  createBatch: async (data: CreateBatchInput) => {
    set({ isLoading: true, error: null })
    try {
      const batch = await apiClient.post<Batch>('/batches', data)
      set((state) => ({
        batches: [batch, ...state.batches],
        isLoading: false,
      }))
      return batch
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to create batch',
        isLoading: false,
      })
      throw error
    }
  },

  updateBatch: async (id: string, data: UpdateBatchInput) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await apiClient.put<Batch>(`/batches/${id}`, data)
      set((state) => ({
        batches: state.batches.map((b) => (b.id === id ? updated : b)),
        selectedBatch:
          state.selectedBatch?.id === id ? updated : state.selectedBatch,
        isLoading: false,
      }))
      return updated
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to update batch',
        isLoading: false,
      })
      throw error
    }
  },

  deleteBatch: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await apiClient.delete(`/batches/${id}`)
      set((state) => ({
        batches: state.batches.filter((b) => b.id !== id),
        selectedBatch:
          state.selectedBatch?.id === id ? null : state.selectedBatch,
        isLoading: false,
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to delete batch',
        isLoading: false,
      })
      throw error
    }
  },

  selectBatch: (batch: Batch | null) => {
    set({ selectedBatch: batch })
  },

  clearError: () => set({ error: null }),
}))
