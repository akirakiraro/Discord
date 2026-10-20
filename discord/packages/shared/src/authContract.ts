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

export const displayNameSchema = z.string().trim().min(1).max(32)

const AVATAR_DATA_URL = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/

export const profileUpdateSchema = z.object({
  displayName: displayNameSchema,
  avatarUrl: z.string().regex(AVATAR_DATA_URL).max(180_000).nullable(),
})

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>

export interface UserDto {
  id: string
  username: string
  displayName: string
  createdAt: string
  /** JPEG em data URL, ou ausente quando a pessoa não escolheu foto. */
  avatarUrl?: string | null
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
