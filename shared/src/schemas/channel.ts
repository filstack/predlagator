// shared/src/schemas/channel.ts
import { z } from 'zod'

export const channelSchema = z.object({
  id: z.string().cuid(),
  username: z.string().min(1),
  category: z.string().min(1),
  tgstatUrl: z.string().url().nullable().optional(),
  collectedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  memberCount: z.number().int().nullable().optional(),
  isVerified: z.boolean().default(false),
  lastChecked: z.date().nullable().optional(),
  isActive: z.boolean().default(true),
  errorCount: z.number().int().default(0),
  lastError: z.string().nullable().optional(),
})

// Create channel input schema
export const createChannelSchema = z.object({
  username: z.string().min(1, 'Username is required').max(100),
  category: z.string().min(1, 'Category is required').max(100),
  tgstatUrl: z.string().url().optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  memberCount: z.number().int().nonnegative().optional(),
  isVerified: z.boolean().optional(),
  collectedAt: z.coerce.date(),
})

// Update channel input schema
export const updateChannelSchema = z.object({
  username: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(100).optional(),
  tgstatUrl: z.string().url().optional().nullable(),
  title: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  memberCount: z.number().int().nonnegative().optional().nullable(),
  isVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
  errorCount: z.number().int().nonnegative().optional(),
  lastError: z.string().optional().nullable(),
  lastChecked: z.coerce.date().optional().nullable(),
})

// Query/filter schema for listing channels
export const channelQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  isVerified: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['username', 'memberCount', 'createdAt', 'lastChecked']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Bulk import schema
export const bulkImportChannelSchema = z.object({
  channels: z.array(createChannelSchema).min(1, 'At least one channel is required'),
})

// Export types
export type Channel = z.infer<typeof channelSchema>
export type CreateChannelInput = z.infer<typeof createChannelSchema>
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>
export type ChannelQuery = z.infer<typeof channelQuerySchema>
export type BulkImportChannel = z.infer<typeof bulkImportChannelSchema>
