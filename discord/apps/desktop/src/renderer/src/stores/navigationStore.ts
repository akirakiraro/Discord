import { create } from 'zustand'

export type MainView = { kind: 'text'; channelId: string } | { kind: 'voice'; channelId: string } | { kind: 'none' }

interface NavigationStore {
  view: MainView
  openTextChannel: (channelId: string) => void
  openVoiceChannel: (channelId: string) => void
  resetView: () => void
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  view: { kind: 'none' },
  openTextChannel: (channelId) => set({ view: { kind: 'text', channelId } }),
  openVoiceChannel: (channelId) => set({ view: { kind: 'voice', channelId } }),
  resetView: () => set({ view: { kind: 'none' } }),
}))
