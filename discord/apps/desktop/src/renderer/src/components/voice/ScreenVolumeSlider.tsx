import { VolumeIcon } from '../common/AudioIcons'
import { useVoiceStore } from '../../stores/voiceStore'

/**
 * Controle do volume só do áudio que vem com a tela compartilhada.
 * Exemplo: `<ScreenVolumeSlider />` no canto da transmissão.
 */
export function ScreenVolumeSlider(): React.JSX.Element {
  const volume = useVoiceStore((store) => store.screenAudioVolume)
  const setVolume = useVoiceStore((store) => store.setScreenAudioVolume)
  const percent = Math.round(volume * 100)

  return (
    <label className="screen-volume">
      <VolumeIcon muted={percent === 0} size={24} />
      <input
        type="range"
        min={0}
        max={100}
        value={percent}
        aria-label="Volume do som da tela"
        style={{ '--volume-fill': `${percent}%` }}
        onChange={(event) => setVolume(Number(event.target.value) / 100)}
      />
    </label>
  )
}
