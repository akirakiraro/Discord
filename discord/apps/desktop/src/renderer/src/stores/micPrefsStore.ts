import { create, type StoreApi, type UseBoundStore } from 'zustand'
import type { KeyValueStorage } from '../lib/savedLogin'
import {
  loadMicPreferences,
  resolveDeviceId,
  saveMicPreferences,
  type MicPreferences,
} from '../lib/voice/micPreferences'

export interface MicPrefsStore extends MicPreferences {
  setDeviceId: (deviceId: string) => void
  setNoiseSuppression: (noiseSuppression: boolean) => void
  setEchoCancellation: (echoCancellation: boolean) => void
  setAutoGainControl: (autoGainControl: boolean) => void
  setGateDb: (gateDb: number) => void
  setInputGain: (inputGain: number) => void
  alignDevice: (knownIds: readonly string[]) => void
}

/**
 * Preferências de microfone deste aparelho. A call lê daqui ao publicar o áudio.
 * Exemplo: `createMicPrefsStore(window.localStorage).getState().setGateDb(-50)`
 */
export function createMicPrefsStore(storage: KeyValueStorage): UseBoundStore<StoreApi<MicPrefsStore>> {
  return create<MicPrefsStore>((set, get) => ({
    ...loadMicPreferences(storage),
    setDeviceId: (deviceId) => writePrefs(set, storage, { ...snapshot(get()), deviceId }),
    setNoiseSuppression: (noiseSuppression) => writePrefs(set, storage, { ...snapshot(get()), noiseSuppression }),
    setEchoCancellation: (echoCancellation) => writePrefs(set, storage, { ...snapshot(get()), echoCancellation }),
    setAutoGainControl: (autoGainControl) => writePrefs(set, storage, { ...snapshot(get()), autoGainControl }),
    setGateDb: (gateDb) => writePrefs(set, storage, { ...snapshot(get()), gateDb }),
    setInputGain: (inputGain) => writePrefs(set, storage, { ...snapshot(get()), inputGain }),
    alignDevice: (knownIds) => alignSavedDevice(set, get, storage, knownIds),
  }))
}

const browserStorage: KeyValueStorage = {
  getItem: (key) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(key)),
  setItem: (key, value) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
  },
}

export const useMicPrefsStore = createMicPrefsStore(browserStorage)

function snapshot(state: MicPrefsStore): MicPreferences {
  return {
    deviceId: state.deviceId,
    noiseSuppression: state.noiseSuppression,
    echoCancellation: state.echoCancellation,
    autoGainControl: state.autoGainControl,
    gateDb: state.gateDb,
    inputGain: state.inputGain,
  }
}

function writePrefs(
  set: (partial: Partial<MicPrefsStore>) => void,
  storage: KeyValueStorage,
  prefs: MicPreferences,
): void {
  // O estado segue o que foi pedido. Reler o storage apagava a escolha quando o localStorage não existe, como no teste.
  set(saveMicPreferences(storage, prefs))
}

function alignSavedDevice(
  set: (partial: Partial<MicPrefsStore>) => void,
  get: () => MicPrefsStore,
  storage: KeyValueStorage,
  knownIds: readonly string[],
): void {
  const current = snapshot(get())
  const deviceId = resolveDeviceId(current.deviceId, knownIds)
  if (deviceId === current.deviceId) return
  writePrefs(set, storage, { ...current, deviceId })
}
