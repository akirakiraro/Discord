import { useState } from 'react'
import { useLocalParticipant, useTracks } from '@livekit/components-react'
import { Track } from 'livekit-client'
import { HeadsetIcon, MicIcon } from '../common/AudioIcons'
import { screenShareSettings } from '../../lib/voice/screenSharePresets'
import { publishFilteredScreenAudio, stopFilteredScreenAudio } from '../../lib/voice/filteredScreenAudio'
import { voiceSession } from '../../lib/voice/voiceSession'
import { deafenButtonTitle, micButtonTitle } from '../../lib/voice/micDeafen'
import { useVoiceStore } from '../../stores/voiceStore'
import { ScreenSharePicker, type ShareSelection } from './ScreenSharePicker'
import { ScreenVolumeSlider } from './ScreenVolumeSlider'

export function VoiceControlBar(): React.JSX.Element {
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant()
  const sharing = useTracks([Track.Source.ScreenShare]).length > 0
  const { micMuted, deafened, toggleMic, toggleDeafen } = useVoiceStore()
  const [pickerOpen, setPickerOpen] = useState(false)

  async function stopShare(): Promise<void> {
    try {
      await stopFilteredScreenAudio(localParticipant)
      await localParticipant.setScreenShareEnabled(false)
    } catch (error) {
      logShareFailure(error)
    }
  }

  async function startShare(selection: ShareSelection): Promise<void> {
    setPickerOpen(false)
    const bridge = window.radcord
    if (!bridge) {
      logShareFailure('ponte radcord ausente')
      return
    }
    const settings = screenShareSettings(selection.quality, selection.frameRate)
    try {
      await bridge.chooseScreenSource(selection.sourceId)
      await localParticipant.setScreenShareEnabled(true, settings.capture, settings.publish)
      await publishFilteredScreenAudio(localParticipant)
    } catch (error) {
      logShareFailure(error)
    }
  }

  function onShareClick(): void {
    if (isScreenShareEnabled) {
      void stopShare()
      return
    }
    setPickerOpen(true)
  }

  return (
    <div className="voice-controls">
      <div className="voice-controls__row">
        <button type="button" className={micMuted ? 'round-button round-button--off' : 'round-button'} title={micButtonTitle({ micMuted, deafened })} onClick={toggleMic}>
          <MicIcon off={micMuted} size={22} />
        </button>
        <button type="button" className={deafened ? 'round-button round-button--off' : 'round-button'} title={deafenButtonTitle(deafened)} onClick={toggleDeafen}>
          <HeadsetIcon off={deafened} size={22} />
        </button>
        <button
          className={isScreenShareEnabled ? 'round-button round-button--live' : 'round-button'}
          title={isScreenShareEnabled ? 'Parar de compartilhar' : 'Compartilhar tela'}
          onClick={onShareClick}
        >
          🖥️
        </button>
        <OwnShareToggle sharing={isScreenShareEnabled} />
        <button className="round-button round-button--danger" title="Sair da call" onClick={() => void voiceSession.leave()}>
          📞
        </button>
        {sharing && <ScreenVolumeSlider />}
      </div>
      {pickerOpen && <ScreenSharePicker onCancel={() => setPickerOpen(false)} onConfirm={(selection) => void startShare(selection)} />}
    </div>
  )
}

function OwnShareToggle({ sharing }: { sharing: boolean }): React.JSX.Element | null {
  const showOwnShare = useVoiceStore((store) => store.showOwnShare)
  const toggleOwnShare = useVoiceStore((store) => store.toggleOwnShare)
  if (!sharing) return null

  const title = showOwnShare ? 'Ocultar minha transmissão' : 'Ver minha transmissão'
  return (
    <button className={showOwnShare ? 'round-button round-button--live' : 'round-button'} title={title} onClick={toggleOwnShare}>
      👁️
    </button>
  )
}

function logShareFailure(error: unknown): void {
  console.error(JSON.stringify({ event: 'screen_share_failed', message: String(error) }))
}
