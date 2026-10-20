import { z } from 'zod'

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.]{3,20}$/, 'use de 3 a 20 caracteres: letras, números, "_" ou "."')

export const joinRequestSchema = z.object({
  username: usernameSchema,
})

export type JoinRequest = z.infer<typeof joinRequestSchema>

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
