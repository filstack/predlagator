/**
 * Channel Validation Schema (Frontend)
 * Feature: 004-manual-channel-management
 *
 * Zod schemas for form validation
 */

import { z } from 'zod'

/**
 * Telegram username regex pattern
 * Format: @username (4-31 alphanumeric or underscore characters)
 */
const TELEGRAM_USERNAME_REGEX = /^@[A-Za-z0-9_]{4,31}$/

/**
 * URL validation pattern
 */
const URL_REGEX = /^https?:\/\/.+/

/**
 * Create/Update channel form schema
 */
export const channelFormSchema = z.object({
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
    .optional()
    .nullable(),

  tgstat_url: z
    .string()
    .max(2048, 'TGStat URL не может быть длиннее 2048 символов')
    .regex(URL_REGEX, 'TGStat URL должен быть валидным HTTP(S) URL')
    .trim()
    .optional()
    .nullable()
    .or(z.literal('')),

  telegram_links: z
    .array(
      z
        .string()
        .trim()
        .refine(
          (val) => val === '' || (val.length <= 2048 && URL_REGEX.test(val)),
          {
            message: 'Ссылка должна быть валидным HTTP(S) URL (не длиннее 2048 символов)',
          }
        )
    )
    .max(10, 'Максимум 10 ссылок на канал')
    .optional()
    .default([])
    .transform((links) => links?.filter((link) => link !== '') || []),  // Remove empty strings
})

export type ChannelFormData = z.infer<typeof channelFormSchema>
