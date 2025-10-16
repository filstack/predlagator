// shared/src/schemas/campaign.ts
import { z } from 'zod'

// Campaign status enum matching Prisma
export const campaignStatusEnum = z.enum(['QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED'])

// Campaign mode enum matching Prisma
export const campaignModeEnum = z.enum(['TEST', 'LIVE'])

// Full campaign schema matching Prisma model
export const campaignSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  batchId: z.string().cuid(),
  templateId: z.string().cuid(),
  params: z.record(z.any()),
  mode: campaignModeEnum,
  deliveryRate: z.number().int().positive(),
  retryLimit: z.number().int().nonnegative(),
  status: campaignStatusEnum,
  progress: z.number().int().nonnegative(),
  totalJobs: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
  startedAt: z.date().nullable().optional(),
  completedAt: z.date().nullable().optional(),
  createdById: z.string().cuid(),
})

// Create campaign input schema
export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200, 'Name too long'),
  description: z.string().max(1000).optional(),
  batchId: z.string().cuid('Invalid batch ID'),
  templateId: z.string().cuid('Invalid template ID'),
  params: z.record(z.any()).default({}),
  mode: campaignModeEnum.default('TEST'),
  deliveryRate: z.number().int().min(1).max(100).default(20),
  retryLimit: z.number().int().min(0).max(5).default(3),
})

// Update campaign input schema
export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  params: z.record(z.any()).optional(),
  mode: campaignModeEnum.optional(),
  deliveryRate: z.number().int().min(1).max(100).optional(),
  retryLimit: z.number().int().min(0).max(5).optional(),
})

// Campaign action schema for status updates
export const campaignActionSchema = z.object({
  action: z.enum(['start', 'pause', 'resume', 'cancel']),
})

// Query/filter schema for listing campaigns
export const campaignQuerySchema = z.object({
  status: campaignStatusEnum.optional(),
  mode: campaignModeEnum.optional(),
  batchId: z.string().cuid().optional(),
  createdById: z.string().cuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['name', 'createdAt', 'status', 'progress']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Export types
export type Campaign = z.infer<typeof campaignSchema>
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>
export type CampaignAction = z.infer<typeof campaignActionSchema>
export type CampaignQuery = z.infer<typeof campaignQuerySchema>
export type CampaignStatus = z.infer<typeof campaignStatusEnum>
export type CampaignMode = z.infer<typeof campaignModeEnum>
