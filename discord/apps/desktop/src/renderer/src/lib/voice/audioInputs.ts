export interface AudioInputDevice {
  deviceId: string
  kind: string
  label: string
}

export interface AudioInputSource {
  enumerateDevices(): Promise<readonly AudioInputDevice[]>
  requestMicrophone(): Promise<{ stop(): void }>
}

/**
 * Entradas de áudio, pedindo permissão só quando o navegador ainda esconde o nome.
 * Exemplo: `await listAudioInputs(browserAudioInputs())`
 */
export async function listAudioInputs(source: AudioInputSource): Promise<AudioInputDevice[]> {
  const first = pickAudioInputs(await source.enumerateDevices())
  if (first.some((device) => device.label !== '')) return first
  const probe = await source.requestMicrophone()
  probe.stop()
  return pickAudioInputs(await source.enumerateDevices())
}

/**
 * Exemplo: `browserAudioInputs()` usa `navigator.mediaDevices` do Electron.
 */
export function browserAudioInputs(): AudioInputSource {
  return {
    enumerateDevices: () => navigator.mediaDevices.enumerateDevices(),
    requestMicrophone: async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      return { stop: () => stream.getTracks().forEach((track) => track.stop()) }
    },
  }
}

/**
 * Rótulo do sistema, ou "Microfone N" enquanto a permissão não liberou o nome.
 * Exemplo: `audioInputLabel({ deviceId: 'a', kind: 'audioinput', label: '' }, 0)`
 */
export function audioInputLabel(device: AudioInputDevice, index: number): string {
  return device.label !== '' ? device.label : `Microfone ${index + 1}`
}

function pickAudioInputs(devices: readonly AudioInputDevice[]): AudioInputDevice[] {
  return devices.filter((device) => device.kind === 'audioinput')
}
