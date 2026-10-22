import { useVoiceStore } from '../../stores/voiceStore'

/**
 * Controle do volume só do áudio que vem com a tela compartilhada.
 * Exemplo: `<ScreenVolumeSlider />` no palco de voz.
 */
export function ScreenVolumeSlider(): React.JSX.Element {
  const volume = useVoiceStore((store) => store.screenAudioVolume)
  const setVolume = useVoiceStore((store) => store.setScreenAudioVolume)

  return (
    <label className="screen-volume">
      <span>Som da tela</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(volume * 100)}
        aria-label="Volume do som da tela"
        onChange={(event) => setVolume(Number(event.target.value) / 100)}
      />
    </label>
  )
}
