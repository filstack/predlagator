"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchQuerySchema = exports.updateBatchSchema = exports.createBatchSchema = exports.batchSchema = void 0;
// shared/src/schemas/batch.ts
const zod_1 = require("zod");
// Full batch schema matching Supabase model
exports.batchSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().nullable().optional(),
    channelCount: zod_1.z.number().int().nonnegative(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    createdById: zod_1.z.string().uuid(),
});
// Create batch input schema
exports.createBatchSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Batch name is required').max(200, 'Name too long'),
    description: zod_1.z.string().max(1000).optional().or(zod_1.z.literal('')).transform(val => val || undefined),
    channelIds: zod_1.z.array(zod_1.z.string().uuid()).default([]).optional(),
});
// Update batch input schema
exports.updateBatchSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().max(1000).optional().nullable(),
    channelIds: zod_1.z.array(zod_1.z.string().uuid()).min(1).optional(),
});
// Query/filter schema for listing batches
exports.batchQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    createdById: zod_1.z.string().uuid().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    sortBy: zod_1.z.enum(['name', 'createdAt', 'channelCount']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
//# sourceMappingURL=batch.js.map