import { create } from 'zustand'
import { clampUnitVolume, OWN_SCREEN_LISTEN, REMOTE_SCREEN_LISTEN } from '../lib/voice/screenAudioVolume'

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
  showOwnTile: boolean
  ownScreenAudioVolume: number
  screenAudioVolume: number
  lastError: string | null
  join: (connection: VoiceConnection) => void
  leave: (error?: string) => void
  toggleMic: () => void
  toggleDeafen: () => void
  toggleOwnShare: () => void
  toggleOwnTile: () => void
  setOwnScreenAudioVolume: (volume: number) => void
  setScreenAudioVolume: (volume: number) => void
}

export const useVoiceStore = create<VoiceStore>((set) => ({
  connection: null,
  micMuted: false,
  deafened: false,
  showOwnShare: true,
  showOwnTile: true,
  ownScreenAudioVolume: OWN_SCREEN_LISTEN,
  screenAudioVolume: REMOTE_SCREEN_LISTEN,
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
  toggleOwnTile: () => set((store) => ({ showOwnTile: !store.showOwnTile })),
  setOwnScreenAudioVolume: (volume) => set({ ownScreenAudioVolume: clampUnitVolume(volume) }),
  setScreenAudioVolume: (volume) => set({ screenAudioVolume: clampUnitVolume(volume) }),
}))

/** Ensurdecer também corta o microfone, como no Discord. */
export function isMicrophoneLive(store: Pick<VoiceStore, 'micMuted' | 'deafened'>): boolean {
  return !store.micMuted && !store.deafened
}
