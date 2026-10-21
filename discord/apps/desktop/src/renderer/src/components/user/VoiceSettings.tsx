import { useEffect, useState } from 'react'
import { audioInputLabel, browserAudioInputs, listAudioInputs, type AudioInputDevice } from '../../lib/voice/audioInputs'
import { useMicPrefsStore } from '../../stores/micPrefsStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { HearMyself } from './HearMyself'
import { useMicLevel } from './useMicLevel'

export function VoiceSettings(): React.JSX.Element {
  const { devices, error } = useAudioInputs()
  const prefs = useMicPrefsStore()

  return (
    <div className="settings-pane">
      <h2>Voz</h2>
      <MicrophoneSelect devices={devices} deviceId={prefs.deviceId} onChange={prefs.setDeviceId} />
      <NoiseToggle enabled={prefs.noiseSuppression} onChange={prefs.setNoiseSuppression} />
      <CaptureToggle label="Cancelamento de eco" enabled={prefs.echoCancellation} onChange={prefs.setEchoCancellation} />
      <CaptureToggle label="Ganho automático" enabled={prefs.autoGainControl} onChange={prefs.setAutoGainControl} />
      <SensitivitySlider value={prefs.inputGain} onChange={prefs.setInputGain} />
      <MicLevel prefs={prefs} />
      <AudioPath />
      <HearMyself />
      {error && <p className="settings-modal__error">{error}</p>}
    </div>
  )
}

function NoiseToggle({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }): React.JSX.Element {
  return <CaptureToggle label="Supressão de ruído" enabled={enabled} onChange={onChange} />
}

function CaptureToggle({
  label,
  enabled,
  onChange,
}: {
  label: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}): React.JSX.Element {
  return (
    <label className="settings-modal__row">
      <input type="checkbox" checked={enabled} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  )
}

function SensitivitySlider({ value, onChange }: { value: number; onChange: (value: number) => void }): React.JSX.Element {
  return (
    <label className="settings-modal__field">
      Sensibilidade
      <input type="range" min={0} max={2} step={0.05} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <span className="settings-modal__scale">
        <span>Esquerda: mais baixo</span>
        <span>Direita: mais alto</span>
      </span>
      <p className="settings-modal__hint">No meio, o volume segue o microfone. Na direita chega ao dobro. Na esquerda chega a mudo.</p>
    </label>
  )
}

function AudioPath(): React.JSX.Element {
  return (
    <div className="settings-modal__field">
      Caminho do áudio
      <ol className="audio-flow">
        <li>O microfone entra no navegador.</li>
        <li>Cancelamento de eco, ganho automático e supressão de ruído entram só se a caixa correspondente estiver marcada.</li>
        <li>A sensibilidade multiplica esse volume, de mudo até o dobro, e esse é o som enviado.</li>
        <li>O servidor comprime e entrega para quem está na chamada. Me ouvir toca essa volta.</li>
        <li>A barra de nível só mede. Ela não muda o que os outros escutam.</li>
      </ol>
    </div>
  )
}

function MicLevel({ prefs }: { prefs: ReturnType<typeof useMicPrefsStore.getState> }): React.JSX.Element {
  const inCall = useVoiceStore((store) => store.connection !== null)
  const level = useMicLevel(prefs, inCall)
  return (
    <div className="settings-modal__field">
      Nível
      <div className="mic-level" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level} aria-label="Nível do microfone">
        <span className="mic-level__fill" style={{ width: `${level}%` }} />
      </div>
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
