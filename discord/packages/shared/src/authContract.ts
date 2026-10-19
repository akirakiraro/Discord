import { z } from 'zod'

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.]{3,20}$/, 'use de 3 a 20 caracteres: letras, números, "_" ou "."')

export const registerRequestSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1).max(32),
  password: z.string().min(6, 'a senha precisa de pelo menos 6 caracteres').max(128),
})

export const loginRequestSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(128),
})

export type RegisterRequest = z.infer<typeof registerRequestSchema>
export type LoginRequest = z.infer<typeof loginRequestSchema>

export interface UserDto {
  id: string
  username: string
  displayName: string
  createdAt: string
}

export interface MemberDto extends UserDto {
  online: boolean
}

export interface AuthResponse {
  token: string
  user: UserDto
}

export interface ApiErrorResponse {
  error: string
  message: string
}
