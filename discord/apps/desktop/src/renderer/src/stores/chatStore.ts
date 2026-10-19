import { create } from 'zustand'
import { EMPTY_CHAT_STATE, type ChatState } from '../lib/chat/chatState'
import type { TypingState } from '../lib/chat/typingState'

export type ChatUpdate = (state: ChatState) => ChatState
export type TypingUpdate = (state: TypingState) => TypingState

interface ChatStore {
  chat: ChatState
  typing: TypingState
  applyChat: (update: ChatUpdate) => void
  applyTyping: (update: TypingUpdate) => void
  resetChat: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  chat: EMPTY_CHAT_STATE,
  typing: {},
  applyChat: (update) => set((store) => ({ chat: update(store.chat) })),
  applyTyping: (update) => set((store) => ({ typing: update(store.typing) })),
  resetChat: () => set({ chat: EMPTY_CHAT_STATE, typing: {} }),
}))
