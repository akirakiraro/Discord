import { create } from 'zustand'
import { EMPTY_VOICE_ROSTER, type VoiceRosterState } from '../lib/voice/voiceRosterState'

export type VoiceRosterUpdate = (state: VoiceRosterState) => VoiceRosterState

interface VoiceRosterStore {
  roster: VoiceRosterState
  applyRoster: (update: VoiceRosterUpdate) => void
  resetRoster: () => void
}

export const useVoiceRosterStore = create<VoiceRosterStore>((set) => ({
  roster: EMPTY_VOICE_ROSTER,
  applyRoster: (update) => set((store) => ({ roster: update(store.roster) })),
  resetRoster: () => set({ roster: EMPTY_VOICE_ROSTER }),
}))
