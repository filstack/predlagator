// shared/src/schemas/auth.ts
import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
})

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  role: z.enum(['ADMIN', 'OPERATOR', 'AUDITOR']).optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
})

export const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  role: z.enum(['ADMIN', 'OPERATOR', 'AUDITOR']).optional(),
  isActive: z.boolean().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
