import { z } from 'zod';
export declare const mediaTypeEnum: z.ZodEnum<["PHOTO", "VIDEO", "DOCUMENT"]>;
export declare const templateSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    content: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    mediaType: z.ZodOptional<z.ZodNullable<z.ZodEnum<["PHOTO", "VIDEO", "DOCUMENT"]>>>;
    mediaUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    usageCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    usageCount: number;
    content: string;
    description?: string | null | undefined;
    mediaType?: "PHOTO" | "VIDEO" | "DOCUMENT" | null | undefined;
    mediaUrl?: string | null | undefined;
}, {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    usageCount: number;
    content: string;
    description?: string | null | undefined;
    mediaType?: "PHOTO" | "VIDEO" | "DOCUMENT" | null | undefined;
    mediaUrl?: string | null | undefined;
}>;
export declare const createTemplateSchema: z.ZodObject<{
    name: z.ZodString;
    content: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    mediaType: z.ZodOptional<z.ZodEnum<["PHOTO", "VIDEO", "DOCUMENT"]>>;
    mediaUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    content: string;
    description?: string | undefined;
    mediaType?: "PHOTO" | "VIDEO" | "DOCUMENT" | undefined;
    mediaUrl?: string | undefined;
}, {
    name: string;
    content: string;
    description?: string | undefined;
    mediaType?: "PHOTO" | "VIDEO" | "DOCUMENT" | undefined;
    mediaUrl?: string | undefined;
}>;
export declare const updateTemplateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    mediaType: z.ZodNullable<z.ZodOptional<z.ZodEnum<["PHOTO", "VIDEO", "DOCUMENT"]>>>;
    mediaUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    content?: string | undefined;
    description?: string | null | undefined;
    mediaType?: "PHOTO" | "VIDEO" | "DOCUMENT" | null | undefined;
    mediaUrl?: string | null | undefined;
}, {
    name?: string | undefined;
    content?: string | undefined;
    description?: string | null | undefined;
    mediaType?: "PHOTO" | "VIDEO" | "DOCUMENT" | null | undefined;
    mediaUrl?: string | null | undefined;
}>;
export declare const templateQuerySchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    mediaType: z.ZodOptional<z.ZodEnum<["PHOTO", "VIDEO", "DOCUMENT"]>>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodEnum<["name", "createdAt", "usageCount"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortBy: "name" | "createdAt" | "usageCount";
    sortOrder: "asc" | "desc";
    search?: string | undefined;
    mediaType?: "PHOTO" | "VIDEO" | "DOCUMENT" | undefined;
}, {
    search?: string | undefined;
    mediaType?: "PHOTO" | "VIDEO" | "DOCUMENT" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: "name" | "createdAt" | "usageCount" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export type Template = z.infer<typeof templateSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type TemplateQuery = z.infer<typeof templateQuerySchema>;
export type MediaType = z.infer<typeof mediaTypeEnum>;
//# sourceMappingURL=template.d.ts.map