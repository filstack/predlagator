"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateQuerySchema = exports.updateTemplateSchema = exports.createTemplateSchema = exports.templateSchema = exports.mediaTypeEnum = void 0;
// shared/src/schemas/template.ts
const zod_1 = require("zod");
// Media type enum matching Prisma
exports.mediaTypeEnum = zod_1.z.enum(['PHOTO', 'VIDEO', 'DOCUMENT']);
// Full template schema matching Supabase model
exports.templateSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1),
    content: zod_1.z.string().min(1),
    description: zod_1.z.string().nullable().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    mediaType: exports.mediaTypeEnum.nullable().optional(),
    mediaUrl: zod_1.z.string().url().nullable().optional(),
    usageCount: zod_1.z.number().int().nonnegative(),
});
// Create template input schema
exports.createTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Template name is required').max(200, 'Name too long'),
    content: zod_1.z.string().min(1, 'Content is required').max(4000, 'Content too long'),
    description: zod_1.z.string().max(1000).optional(),
    mediaType: exports.mediaTypeEnum.optional(),
    mediaUrl: zod_1.z.string().url('Invalid media URL').optional(),
});
// Update template input schema
exports.updateTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200).optional(),
    content: zod_1.z.string().min(1).max(4000).optional(),
    description: zod_1.z.string().max(1000).optional().nullable(),
    mediaType: exports.mediaTypeEnum.optional().nullable(),
    mediaUrl: zod_1.z.string().url().optional().nullable(),
});
// Query/filter schema for listing templates
exports.templateQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    mediaType: exports.mediaTypeEnum.optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    sortBy: zod_1.z.enum(['name', 'createdAt', 'usageCount']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
//# sourceMappingURL=template.js.map