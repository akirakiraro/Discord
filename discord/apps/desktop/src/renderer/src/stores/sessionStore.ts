import { create } from 'zustand'
import type { UserDto } from '@radcord/shared'
import type { RadcordApiClient } from '../lib/api/apiClient'

export interface AuthSession {
  api: RadcordApiClient
  token: string
  user: UserDto
}

interface SessionStore {
  session: AuthSession | null
  /** Motivo exibido na tela de login quando a sessão cai sozinha (ex.: host apagou o banco). */
  signOutReason: string | null
  signIn: (session: AuthSession) => void
  signOut: (reason?: string) => void
  updateUser: (user: UserDto) => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  session: null,
  signOutReason: null,
  signIn: (session) => set({ session, signOutReason: null }),
  signOut: (reason) => set({ session: null, signOutReason: reason ?? null }),
  updateUser: (user) =>
    set((store) => (store.session ? { session: { ...store.session, user } } : store)),
}))
