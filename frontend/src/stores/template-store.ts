// frontend/src/stores/template-store.ts
import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'
import type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateQuery,
} from '@shared/schemas'

interface TemplateState {
  templates: Template[]
  selectedTemplate: Template | null
  totalCount: number
  currentPage: number
  isLoading: boolean
  error: string | null

  // Actions
  fetchTemplates: (query?: TemplateQuery) => Promise<void>
  createTemplate: (data: CreateTemplateInput) => Promise<Template>
  updateTemplate: (id: string, data: UpdateTemplateInput) => Promise<Template>
  deleteTemplate: (id: string) => Promise<void>
  selectTemplate: (template: Template | null) => void
  clearError: () => void
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  selectedTemplate: null,
  totalCount: 0,
  currentPage: 1,
  isLoading: false,
  error: null,

  fetchTemplates: async (query?: TemplateQuery) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get<{
        data: Template[]
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
        }
      }>('/templates', query)
      set({
        templates: response.data || [],
        totalCount: response.pagination?.total || 0,
        currentPage: response.pagination?.page || 1,
        isLoading: false,
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to fetch templates',
        isLoading: false,
        templates: [],
      })
    }
  },

  createTemplate: async (data: CreateTemplateInput) => {
    set({ isLoading: true, error: null })
    try {
      const template = await apiClient.post<Template>('/templates', data)
      set((state) => ({
        templates: [template, ...state.templates],
        isLoading: false,
      }))
      return template
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to create template',
        isLoading: false,
      })
      throw error
    }
  },

  updateTemplate: async (id: string, data: UpdateTemplateInput) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await apiClient.put<Template>(`/templates/${id}`, data)
      set((state) => ({
        templates: state.templates.map((t) => (t.id === id ? updated : t)),
        selectedTemplate:
          state.selectedTemplate?.id === id ? updated : state.selectedTemplate,
        isLoading: false,
      }))
      return updated
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to update template',
        isLoading: false,
      })
      throw error
    }
  },

  deleteTemplate: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await apiClient.delete(`/templates/${id}`)
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
        selectedTemplate:
          state.selectedTemplate?.id === id ? null : state.selectedTemplate,
        isLoading: false,
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to delete template',
        isLoading: false,
      })
      throw error
    }
  },

  selectTemplate: (template: Template | null) => {
    set({ selectedTemplate: template })
  },

  clearError: () => set({ error: null }),
}))
