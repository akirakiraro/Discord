import { useEffect, useState } from 'react'
import { logout } from '../../lib/auth/logout'
import { audioInputLabel, browserAudioInputs, listAudioInputs, type AudioInputDevice } from '../../lib/voice/audioInputs'
import { useMicPrefsStore } from '../../stores/micPrefsStore'
import { useSessionStore } from '../../stores/sessionStore'

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps): React.JSX.Element {
  const session = useSessionStore((store) => store.session)
  const { devices, error } = useAudioInputs()
  const prefs = useMicPrefsStore()

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal" role="dialog" aria-labelledby="settings-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="settings-title">Configurações</h2>
        <MicrophoneSelect devices={devices} deviceId={prefs.deviceId} onChange={prefs.setDeviceId} />
        <NoiseToggle enabled={prefs.noiseSuppression} onChange={prefs.setNoiseSuppression} />
        <SensitivitySlider value={prefs.inputGain} onChange={prefs.setInputGain} />
        {error && <p className="settings-modal__error">{error}</p>}
        <div className="settings-modal__actions">
          {session && (
            <button type="button" className="settings-modal__logout" onClick={() => void logout(session)}>
              Sair da conta
            </button>
          )}
          <button type="button" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

function NoiseToggle({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }): React.JSX.Element {
  return (
    <label className="settings-modal__row">
      <input type="checkbox" checked={enabled} onChange={(event) => onChange(event.target.checked)} />
      Supressão de ruído
    </label>
  )
}

function SensitivitySlider({ value, onChange }: { value: number; onChange: (value: number) => void }): React.JSX.Element {
  return (
    <label className="settings-modal__field">
      Sensibilidade
      <input type="range" min={0} max={2} step={0.05} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
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
  const inputs = devices.filter((device) => device.deviceId !== 'default')
  return (
    <label className="settings-modal__field">
      Microfone
      <select value={deviceId} onChange={(event) => onChange(event.target.value)}>
        <option value="default">Padrão do sistema</option>
        {inputs.map((device, index) => (
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
