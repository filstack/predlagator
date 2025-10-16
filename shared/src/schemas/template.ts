// shared/src/schemas/template.ts
import { z } from 'zod'

// Media type enum matching Prisma
export const mediaTypeEnum = z.enum(['PHOTO', 'VIDEO', 'DOCUMENT'])

// Full template schema matching Prisma model
export const templateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1),
  content: z.string().min(1),
  description: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  mediaType: mediaTypeEnum.nullable().optional(),
  mediaUrl: z.string().url().nullable().optional(),
  usageCount: z.number().int().nonnegative(),
})

// Create template input schema
export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200, 'Name too long'),
  content: z.string().min(1, 'Content is required').max(4000, 'Content too long'),
  description: z.string().max(1000).optional(),
  mediaType: mediaTypeEnum.optional(),
  mediaUrl: z.string().url('Invalid media URL').optional(),
})

// Update template input schema
export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(4000).optional(),
  description: z.string().max(1000).optional().nullable(),
  mediaType: mediaTypeEnum.optional().nullable(),
  mediaUrl: z.string().url().optional().nullable(),
})

// Query/filter schema for listing templates
export const templateQuerySchema = z.object({
  search: z.string().optional(),
  mediaType: mediaTypeEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['name', 'createdAt', 'usageCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Export types
export type Template = z.infer<typeof templateSchema>
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>
export type TemplateQuery = z.infer<typeof templateQuerySchema>
export type MediaType = z.infer<typeof mediaTypeEnum>
