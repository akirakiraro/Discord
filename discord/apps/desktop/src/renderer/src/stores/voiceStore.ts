import { create } from 'zustand'
import { applyDeafenToggle, applyMicToggle, OPEN_MIC, type MicDeafenState } from '../lib/voice/micDeafen'
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
  micMutedBeforeDeafen: boolean
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
  ...OPEN_MIC,
  showOwnShare: true,
  showOwnTile: true,
  ownScreenAudioVolume: OWN_SCREEN_LISTEN,
  screenAudioVolume: REMOTE_SCREEN_LISTEN,
  lastError: null,
  join: (connection) => set({ connection, lastError: null }),
  leave: (error) => set({ connection: null, lastError: error ?? null }),
  toggleMic: () => set((store) => applyMicToggle(controlsOf(store))),
  toggleDeafen: () => set((store) => applyDeafenToggle(controlsOf(store))),
  toggleOwnShare: () => set((store) => ({ showOwnShare: !store.showOwnShare })),
  toggleOwnTile: () => set((store) => ({ showOwnTile: !store.showOwnTile })),
  setOwnScreenAudioVolume: (volume) => set({ ownScreenAudioVolume: clampUnitVolume(volume) }),
  setScreenAudioVolume: (volume) => set({ screenAudioVolume: clampUnitVolume(volume) }),
}))

/** Ensurdecer também corta o microfone, como no Discord. */
export function isMicrophoneLive(store: Pick<VoiceStore, 'micMuted' | 'deafened'>): boolean {
  return !store.micMuted && !store.deafened
}

function controlsOf(store: VoiceStore): MicDeafenState {
  return {
    micMuted: store.micMuted,
    deafened: store.deafened,
    micMutedBeforeDeafen: store.micMutedBeforeDeafen,
  }
}
