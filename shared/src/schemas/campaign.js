"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignQuerySchema = exports.campaignActionSchema = exports.updateCampaignSchema = exports.createCampaignSchema = exports.campaignSchema = exports.campaignModeEnum = exports.campaignStatusEnum = void 0;
// shared/src/schemas/campaign.ts
const zod_1 = require("zod");
// Campaign status enum matching Prisma
exports.campaignStatusEnum = zod_1.z.enum(['QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED']);
// Campaign mode enum matching Prisma
exports.campaignModeEnum = zod_1.z.enum(['TEST', 'LIVE']);
// Full campaign schema matching Supabase model
exports.campaignSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().nullable().optional(),
    batchId: zod_1.z.string().uuid(),
    templateId: zod_1.z.string().uuid(),
    params: zod_1.z.record(zod_1.z.any()),
    mode: exports.campaignModeEnum,
    deliveryRate: zod_1.z.number().int().positive(),
    retryLimit: zod_1.z.number().int().nonnegative(),
    status: exports.campaignStatusEnum,
    progress: zod_1.z.number().int().nonnegative(),
    totalJobs: zod_1.z.number().int().nonnegative(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    startedAt: zod_1.z.date().nullable().optional(),
    completedAt: zod_1.z.date().nullable().optional(),
    createdById: zod_1.z.string().uuid(),
});
// Create campaign input schema
exports.createCampaignSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Campaign name is required').max(200, 'Name too long'),
    description: zod_1.z.string().max(1000).optional(),
    batchId: zod_1.z.string().uuid('Invalid batch ID'),
    templateId: zod_1.z.string().uuid('Invalid template ID'),
    params: zod_1.z.record(zod_1.z.any()).default({}),
    mode: exports.campaignModeEnum.default('TEST'),
    deliveryRate: zod_1.z.number().int().min(1).max(100).default(20),
    retryLimit: zod_1.z.number().int().min(0).max(5).default(3),
});
// Update campaign input schema
exports.updateCampaignSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().max(1000).optional().nullable(),
    params: zod_1.z.record(zod_1.z.any()).optional(),
    mode: exports.campaignModeEnum.optional(),
    deliveryRate: zod_1.z.number().int().min(1).max(100).optional(),
    retryLimit: zod_1.z.number().int().min(0).max(5).optional(),
});
// Campaign action schema for status updates
exports.campaignActionSchema = zod_1.z.object({
    action: zod_1.z.enum(['start', 'pause', 'resume', 'cancel']),
});
// Query/filter schema for listing campaigns
exports.campaignQuerySchema = zod_1.z.object({
    status: exports.campaignStatusEnum.optional(),
    mode: exports.campaignModeEnum.optional(),
    batchId: zod_1.z.string().uuid().optional(),
    createdById: zod_1.z.string().uuid().optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    sortBy: zod_1.z.enum(['name', 'createdAt', 'status', 'progress']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
//# sourceMappingURL=campaign.js.map