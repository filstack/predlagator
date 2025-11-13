import { z } from 'zod';
export declare const batchSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    channelCount: z.ZodNumber;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    createdById: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    channelCount: number;
    createdById: string;
    description?: string | null | undefined;
}, {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    channelCount: number;
    createdById: string;
    description?: string | null | undefined;
}>;
export declare const createBatchSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodEffects<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>, string | undefined, string | undefined>;
    channelIds: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
    channelIds?: string[] | undefined;
}, {
    name: string;
    description?: string | undefined;
    channelIds?: string[] | undefined;
}>;
export declare const updateBatchSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    channelIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | null | undefined;
    channelIds?: string[] | undefined;
}, {
    name?: string | undefined;
    description?: string | null | undefined;
    channelIds?: string[] | undefined;
}>;
export declare const batchQuerySchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    createdById: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodEnum<["name", "createdAt", "channelCount"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortBy: "name" | "createdAt" | "channelCount";
    sortOrder: "asc" | "desc";
    search?: string | undefined;
    createdById?: string | undefined;
}, {
    search?: string | undefined;
    createdById?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: "name" | "createdAt" | "channelCount" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export type Batch = z.infer<typeof batchSchema>;
export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
export type BatchQuery = z.infer<typeof batchQuerySchema>;
//# sourceMappingURL=batch.d.ts.map