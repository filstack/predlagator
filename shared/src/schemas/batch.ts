// shared/src/schemas/batch.ts
import { z } from 'zod'

// Full batch schema matching Prisma model
export const batchSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  channelCount: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdById: z.string().cuid(),
})

// Create batch input schema
export const createBatchSchema = z.object({
  name: z.string().min(1, 'Batch name is required').max(200, 'Name too long'),
  description: z.string().max(1000).optional(),
  channelIds: z.array(z.string().cuid()).default([]).optional(),
})

// Update batch input schema
export const updateBatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  channelIds: z.array(z.string().cuid()).min(1).optional(),
})

// Query/filter schema for listing batches
export const batchQuerySchema = z.object({
  search: z.string().optional(),
  createdById: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['name', 'createdAt', 'channelCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Export types
export type Batch = z.infer<typeof batchSchema>
export type CreateBatchInput = z.infer<typeof createBatchSchema>
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>
export type BatchQuery = z.infer<typeof batchQuerySchema>
