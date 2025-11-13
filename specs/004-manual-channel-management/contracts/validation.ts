/**
 * Validation Schemas
 * Feature: 004-manual-channel-management
 *
 * Zod validation schemas for channel operations
 * Shared between backend (API validation) and frontend (form validation)
 */

import { z } from 'zod';

/**
 * Telegram username regex pattern
 * Format: @username (4-31 alphanumeric or underscore characters)
 */
const TELEGRAM_USERNAME_REGEX = /^@[A-Za-z0-9_]{4,31}$/;

/**
 * URL validation pattern
 */
const URL_REGEX = /^https?:\/\/.+/;

/**
 * Channel status enum schema
 */
export const channelStatusSchema = z.enum(['active', 'inactive']);

/**
 * Create channel request schema
 */
export const createChannelSchema = z.object({
  name: z
    .string()
    .min(1, 'Название канала обязательно')
    .max(255, 'Название не может быть длиннее 255 символов')
    .trim(),

  username: z
    .string()
    .min(5, 'Username должен содержать минимум 5 символов')
    .max(32, 'Username не может быть длиннее 32 символов')
    .regex(TELEGRAM_USERNAME_REGEX, 'Username должен начинаться с @ и содержать только буквы, цифры и подчёркивания')
    .trim(),

  title: z
    .string()
    .max(255, 'Title не может быть длиннее 255 символов')
    .trim()
    .nullable()
    .optional(),

  tgstat_url: z
    .string()
    .max(2048, 'TGStat URL не может быть длиннее 2048 символов')
    .regex(URL_REGEX, 'TGStat URL должен быть валидным HTTP(S) URL')
    .trim()
    .nullable()
    .optional(),

  telegram_links: z
    .array(
      z
        .string()
        .max(2048, 'Каждая ссылка не может быть длиннее 2048 символов')
        .regex(URL_REGEX, 'Ссылка должна быть валидным HTTP(S) URL')
        .trim()
    )
    .max(10, 'Максимум 10 ссылок на канал')
    .optional()
    .default([]),
});

/**
 * Update channel request schema
 * Same as create, but all fields optional except updated_at
 */
export const updateChannelSchema = z.object({
  name: z
    .string()
    .min(1, 'Название канала обязательно')
    .max(255, 'Название не может быть длиннее 255 символов')
    .trim()
    .optional(),

  username: z
    .string()
    .min(5, 'Username должен содержать минимум 5 символов')
    .max(32, 'Username не может быть длиннее 32 символов')
    .regex(TELEGRAM_USERNAME_REGEX, 'Username должен начинаться с @ и содержать только буквы, цифры и подчёркивания')
    .trim()
    .optional(),

  title: z
    .string()
    .max(255, 'Title не может быть длиннее 255 символов')
    .trim()
    .nullable()
    .optional(),

  tgstat_url: z
    .string()
    .max(2048, 'TGStat URL не может быть длиннее 2048 символов')
    .regex(URL_REGEX, 'TGStat URL должен быть валидным HTTP(S) URL')
    .trim()
    .nullable()
    .optional(),

  telegram_links: z
    .array(
      z
        .string()
        .max(2048, 'Каждая ссылка не может быть длиннее 2048 символов')
        .regex(URL_REGEX, 'Ссылка должна быть валидным HTTP(S) URL')
        .trim()
    )
    .max(10, 'Максимум 10 ссылок на канал')
    .optional(),

  status: channelStatusSchema.optional(),

  // Required for optimistic locking
  updated_at: z
    .string()
    .datetime({ message: 'Неверный формат даты обновления' }),
});

/**
 * List channels query parameters schema
 */
export const listChannelsQuerySchema = z.object({
  page: z
    .number()
    .int()
    .positive()
    .default(1)
    .optional(),

  limit: z
    .number()
    .int()
    .positive()
    .max(1000, 'Максимум 1000 каналов на странице')
    .default(100)
    .optional(),

  sort_by: z
    .enum(['created_at', 'updated_at', 'name', 'username'])
    .default('created_at')
    .optional(),

  sort_order: z
    .enum(['asc', 'desc'])
    .default('desc')
    .optional(),

  status: channelStatusSchema.optional(),
});

/**
 * Username check schema
 */
export const checkUsernameSchema = z.object({
  username: z
    .string()
    .min(5)
    .max(32)
    .regex(TELEGRAM_USERNAME_REGEX),

  exclude_channel_id: z
    .string()
    .uuid()
    .optional(), // Exclude current channel when editing
});

/**
 * Channel ID parameter schema
 */
export const channelIdSchema = z.object({
  id: z.string().uuid('Неверный формат ID канала'),
});

// Type exports для TypeScript inference
export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
export type ListChannelsQuery = z.infer<typeof listChannelsQuerySchema>;
export type CheckUsernameInput = z.infer<typeof checkUsernameSchema>;
export type ChannelIdParam = z.infer<typeof channelIdSchema>;
