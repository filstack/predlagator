import { z } from 'zod';
export declare const campaignStatusEnum: z.ZodEnum<["QUEUED", "RUNNING", "PAUSED", "COMPLETED", "FAILED", "CANCELLED"]>;
export declare const campaignModeEnum: z.ZodEnum<["TEST", "LIVE"]>;
export declare const campaignSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    batchId: z.ZodString;
    templateId: z.ZodString;
    params: z.ZodRecord<z.ZodString, z.ZodAny>;
    mode: z.ZodEnum<["TEST", "LIVE"]>;
    deliveryRate: z.ZodNumber;
    retryLimit: z.ZodNumber;
    status: z.ZodEnum<["QUEUED", "RUNNING", "PAUSED", "COMPLETED", "FAILED", "CANCELLED"]>;
    progress: z.ZodNumber;
    totalJobs: z.ZodNumber;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    startedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    completedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    createdById: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    status: "QUEUED" | "FAILED" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED";
    params: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    totalJobs: number;
    deliveryRate: number;
    retryLimit: number;
    createdById: string;
    batchId: string;
    templateId: string;
    mode: "TEST" | "LIVE";
    progress: number;
    description?: string | null | undefined;
    startedAt?: Date | null | undefined;
    completedAt?: Date | null | undefined;
}, {
    name: string;
    id: string;
    status: "QUEUED" | "FAILED" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED";
    params: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    totalJobs: number;
    deliveryRate: number;
    retryLimit: number;
    createdById: string;
    batchId: string;
    templateId: string;
    mode: "TEST" | "LIVE";
    progress: number;
    description?: string | null | undefined;
    startedAt?: Date | null | undefined;
    completedAt?: Date | null | undefined;
}>;
export declare const createCampaignSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    batchId: z.ZodString;
    templateId: z.ZodString;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    mode: z.ZodDefault<z.ZodEnum<["TEST", "LIVE"]>>;
    deliveryRate: z.ZodDefault<z.ZodNumber>;
    retryLimit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    params: Record<string, any>;
    deliveryRate: number;
    retryLimit: number;
    batchId: string;
    templateId: string;
    mode: "TEST" | "LIVE";
    description?: string | undefined;
}, {
    name: string;
    batchId: string;
    templateId: string;
    description?: string | undefined;
    params?: Record<string, any> | undefined;
    mode?: "TEST" | "LIVE" | undefined;
    deliveryRate?: number | undefined;
    retryLimit?: number | undefined;
}>;
export declare const updateCampaignSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    mode: z.ZodOptional<z.ZodEnum<["TEST", "LIVE"]>>;
    deliveryRate: z.ZodOptional<z.ZodNumber>;
    retryLimit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | null | undefined;
    params?: Record<string, any> | undefined;
    mode?: "TEST" | "LIVE" | undefined;
    deliveryRate?: number | undefined;
    retryLimit?: number | undefined;
}, {
    name?: string | undefined;
    description?: string | null | undefined;
    params?: Record<string, any> | undefined;
    mode?: "TEST" | "LIVE" | undefined;
    deliveryRate?: number | undefined;
    retryLimit?: number | undefined;
}>;
export declare const campaignActionSchema: z.ZodObject<{
    action: z.ZodEnum<["start", "pause", "resume", "cancel"]>;
}, "strip", z.ZodTypeAny, {
    action: "pause" | "resume" | "start" | "cancel";
}, {
    action: "pause" | "resume" | "start" | "cancel";
}>;
export declare const campaignQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["QUEUED", "RUNNING", "PAUSED", "COMPLETED", "FAILED", "CANCELLED"]>>;
    mode: z.ZodOptional<z.ZodEnum<["TEST", "LIVE"]>>;
    batchId: z.ZodOptional<z.ZodString>;
    createdById: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodEnum<["name", "createdAt", "status", "progress"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortBy: "name" | "status" | "createdAt" | "progress";
    sortOrder: "asc" | "desc";
    status?: "QUEUED" | "FAILED" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED" | undefined;
    mode?: "TEST" | "LIVE" | undefined;
    batchId?: string | undefined;
    createdById?: string | undefined;
    search?: string | undefined;
}, {
    status?: "QUEUED" | "FAILED" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED" | undefined;
    mode?: "TEST" | "LIVE" | undefined;
    batchId?: string | undefined;
    createdById?: string | undefined;
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: "name" | "status" | "createdAt" | "progress" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export type Campaign = z.infer<typeof campaignSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CampaignAction = z.infer<typeof campaignActionSchema>;
export type CampaignQuery = z.infer<typeof campaignQuerySchema>;
export type CampaignStatus = z.infer<typeof campaignStatusEnum>;
export type CampaignMode = z.infer<typeof campaignModeEnum>;
//# sourceMappingURL=campaign.d.ts.map