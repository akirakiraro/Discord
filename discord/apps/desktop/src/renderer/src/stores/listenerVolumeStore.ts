import { create, type StoreApi, type UseBoundStore } from 'zustand'
import type { KeyValueStorage } from '../lib/savedLogin'
import {
  loadListenerVolumes,
  saveListenerVolumes,
  withListenerGain,
  type ListenerVolumeFile,
} from '../lib/voice/listenerVolume'

export interface ListenerVolumeStore {
  file: ListenerVolumeFile
  setGain: (localUserId: string, remoteUserId: string, gain: number) => void
}

/**
 * Volume com que este aparelho ouve cada pessoa, separado por quem está logado.
 * Exemplo: `createListenerVolumeStore(localStorage).getState().setGain('eu', 'ela', 1.5)`
 */
export function createListenerVolumeStore(storage: KeyValueStorage): UseBoundStore<StoreApi<ListenerVolumeStore>> {
  return create<ListenerVolumeStore>((set, get) => ({
    file: loadListenerVolumes(storage),
    setGain: (localUserId, remoteUserId, gain) => storeGain(set, get, storage, localUserId, remoteUserId, gain),
  }))
}

const browserStorage: KeyValueStorage = {
  getItem: (key) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(key)),
  setItem: (key, value) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
  },
}

export const useListenerVolumeStore = createListenerVolumeStore(browserStorage)

function storeGain(
  set: (partial: Pick<ListenerVolumeStore, 'file'>) => void,
  get: () => ListenerVolumeStore,
  storage: KeyValueStorage,
  localUserId: string,
  remoteUserId: string,
  gain: number,
): void {
  const file = withListenerGain(get().file, localUserId, remoteUserId, gain)
  saveListenerVolumes(storage, file)
  set({ file })
}
