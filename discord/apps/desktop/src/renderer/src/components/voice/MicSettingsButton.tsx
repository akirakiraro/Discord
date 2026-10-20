import { useEffect, useState } from 'react'
import { GearIcon } from '../common/AudioIcons'
import { audioInputLabel, browserAudioInputs, listAudioInputs, type AudioInputDevice } from '../../lib/voice/audioInputs'
import { useMicPrefsStore } from '../../stores/micPrefsStore'

export function MicSettingsButton(): React.JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <div className="mic-settings">
      <button
        className={open ? 'round-button round-button--live' : 'round-button'}
        title="Configurações do microfone"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <GearIcon />
      </button>
      {open && <MicSettingsPanel />}
    </div>
  )
}

function MicSettingsPanel(): React.JSX.Element {
  const { devices, error } = useAudioInputs()
  const prefs = useMicPrefsStore()

  return (
    <div className="mic-settings__panel" role="dialog" aria-label="Configurações do microfone">
      <MicrophoneSelect devices={devices} deviceId={prefs.deviceId} onChange={prefs.setDeviceId} />
      <label className="mic-settings__row">
        <input type="checkbox" checked={prefs.noiseSuppression} onChange={(event) => prefs.setNoiseSuppression(event.target.checked)} />
        Supressão de ruído
      </label>
      <label className="mic-settings__field">
        Sensibilidade
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={prefs.inputGain}
          onChange={(event) => prefs.setInputGain(Number(event.target.value))}
        />
      </label>
      {error && <p className="mic-settings__error">{error}</p>}
    </div>
  )
}

function MicrophoneSelect({
  devices,
  deviceId,
  onChange,
}: {
  devices: readonly AudioInputDevice[]
  deviceId: string
  onChange: (deviceId: string) => void
}): React.JSX.Element {
  return (
    <label className="mic-settings__field">
      Microfone
      <select value={deviceId} onChange={(event) => onChange(event.target.value)}>
        <option value="default">Padrão do sistema</option>
        {devices.filter((device) => device.deviceId !== 'default').map((device, index) => (
          <option key={device.deviceId} value={device.deviceId}>
            {audioInputLabel(device, index)}
          </option>
        ))}
      </select>
    </label>
  )
}

function useAudioInputs(): { devices: AudioInputDevice[]; error: string | null } {
  const [devices, setDevices] = useState<AudioInputDevice[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      void loadInputs(
        () => cancelled,
        (list) => {
          setDevices(list)
          setError(null)
        },
        setError,
      )
    }
    refresh()
    navigator.mediaDevices.addEventListener('devicechange', refresh)
    return () => {
      cancelled = true
      navigator.mediaDevices.removeEventListener('devicechange', refresh)
    }
  }, [])

  return { devices, error }
}

async function loadInputs(
  isCancelled: () => boolean,
  apply: (list: AudioInputDevice[]) => void,
  fail: (message: string) => void,
): Promise<void> {
  try {
    const list = await listAudioInputs(browserAudioInputs())
    if (isCancelled()) return
    useMicPrefsStore.getState().alignDevice(list.map((device) => device.deviceId))
    apply(list)
  } catch (error) {
    if (isCancelled()) return
    const message = error instanceof Error ? error.message : String(error)
    fail(`Não foi possível listar os microfones: ${message}`)
  }
}
