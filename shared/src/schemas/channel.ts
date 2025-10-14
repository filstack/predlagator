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

export const createChannelSchema = z.object({
  username: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  tgstatUrl: z.string().url().optional(),
  collectedAt: z.coerce.date(),
})

export const channelQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type Channel = z.infer<typeof channelSchema>
export type CreateChannelInput = z.infer<typeof createChannelSchema>
export type ChannelQuery = z.infer<typeof channelQuerySchema>
