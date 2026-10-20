import { create } from 'zustand'

interface MembersPanelStore {
  open: boolean
  toggle: () => void
}

/** A coluna da direita começa aberta. Exemplo: `useMembersPanelStore.getState().toggle()` */
export const useMembersPanelStore = create<MembersPanelStore>((set) => ({
  open: true,
  toggle: () => set((store) => ({ open: !store.open })),
}))
