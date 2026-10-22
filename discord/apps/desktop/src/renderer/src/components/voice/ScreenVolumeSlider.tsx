import { useTracks } from '@livekit/components-react'
import { Track } from 'livekit-client'
import { VolumeIcon } from '../common/AudioIcons'
import { volumeTarget } from '../../lib/voice/screenAudioVolume'
import { useVoiceStore } from '../../stores/voiceStore'

/**
 * Volume do que esta pessoa ouve. A própria tela começa em zero; a dos outros, no máximo.
 * Exemplo: `<ScreenVolumeSlider />` na linha dos botões.
 */
export function ScreenVolumeSlider(): React.JSX.Element {
  const { percent, setPercent } = useScreenVolumeKnob()

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
        onChange={(event) => setPercent(Number(event.target.value))}
      />
    </label>
  )
}

function useScreenVolumeKnob(): { percent: number; setPercent: (percent: number) => void } {
  const tracks = useTracks([Track.Source.ScreenShareAudio])
  const hearingOwn = tracks.some((track) => track.participant.isLocal)
  const hearingRemote = tracks.some((track) => !track.participant.isLocal)
  const own = useVoiceStore((store) => store.ownScreenAudioVolume)
  const remote = useVoiceStore((store) => store.screenAudioVolume)
  const setOwn = useVoiceStore((store) => store.setOwnScreenAudioVolume)
  const setRemote = useVoiceStore((store) => store.setScreenAudioVolume)
  const target = volumeTarget(hearingOwn, hearingRemote)
  const volume = target === 'own' ? own : remote
  const setVolume = target === 'own' ? setOwn : setRemote
  return { percent: Math.round(volume * 100), setPercent: (percent) => setVolume(percent / 100) }
}
