import { create } from 'zustand'

export interface VoiceConnection {
  channelId: string
  token: string
  livekitUrl: string
}

export interface VoiceStore {
  connection: VoiceConnection | null
  micMuted: boolean
  deafened: boolean
  showOwnShare: boolean
  lastError: string | null
  join: (connection: VoiceConnection) => void
  leave: (error?: string) => void
  toggleMic: () => void
  toggleDeafen: () => void
  toggleOwnShare: () => void
}

export const useVoiceStore = create<VoiceStore>((set) => ({
  connection: null,
  micMuted: false,
  deafened: false,
  showOwnShare: true,
  lastError: null,
  join: (connection) => set({ connection, lastError: null }),
  leave: (error) => set({ connection: null, lastError: error ?? null }),
  toggleMic: () => set((store) => ({ micMuted: !store.micMuted })),
  toggleDeafen: () =>
    set((store) => {
      const deafened = !store.deafened
      return { deafened, micMuted: deafened || store.micMuted }
    }),
  toggleOwnShare: () => set((store) => ({ showOwnShare: !store.showOwnShare })),
}))

/** Ensurdecer também corta o microfone, como no Discord. */
export function isMicrophoneLive(store: Pick<VoiceStore, 'micMuted' | 'deafened'>): boolean {
  return !store.micMuted && !store.deafened
}
