import { useEffect, useState } from 'react'
import { audioInputLabel, browserAudioInputs, listAudioInputs, type AudioInputDevice } from '../../lib/voice/audioInputs'
import { dbToPercent, GATE_MAX_DB, GATE_MIN_DB } from '../../lib/voice/micLevel'
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
      <VolumeSlider value={prefs.inputGain} onChange={prefs.setInputGain} />
      <SensitivitySlider value={prefs.gateDb} onChange={prefs.setGateDb} />
      <MicLevel prefs={prefs} />
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

function VolumeSlider({ value, onChange }: { value: number; onChange: (value: number) => void }): React.JSX.Element {
  const percent = Math.round(value * 100)
  return (
    <label className="settings-modal__field">
      Volume · {percent}%
      <input type="range" min={0} max={4} step={0.05} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

function SensitivitySlider({ value, onChange }: { value: number; onChange: (value: number) => void }): React.JSX.Element {
  return (
    <label className="settings-modal__field">
      Sensibilidade · {value} dB
      <input
        type="range"
        min={GATE_MIN_DB}
        max={GATE_MAX_DB}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function MicLevel({ prefs }: { prefs: ReturnType<typeof useMicPrefsStore.getState> }): React.JSX.Element {
  const inCall = useVoiceStore((store) => store.connection !== null)
  const levelDb = useMicLevel(prefs, inCall)
  const level = dbToPercent(levelDb)
  const mark = dbToPercent(prefs.gateDb)
  return (
    <div className="settings-modal__field">
      Nível · {Math.round(levelDb)} dB
      <div className="mic-level" role="meter" aria-valuemin={-80} aria-valuemax={0} aria-valuenow={Math.round(levelDb)} aria-label="Nível do microfone">
        <span className="mic-level__fill" style={{ width: `${level}%` }} />
        <span className="mic-level__mark" style={{ left: `${mark}%` }} title={`Portão em ${prefs.gateDb} dB`} />
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
