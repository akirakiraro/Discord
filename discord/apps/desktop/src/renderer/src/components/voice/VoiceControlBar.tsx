import { useState } from 'react'
import { useLocalParticipant } from '@livekit/components-react'
import { HeadsetIcon, MicIcon } from '../common/AudioIcons'
import { screenShareSettings } from '../../lib/voice/screenSharePresets'
import { voiceSession } from '../../lib/voice/voiceSession'
import { useVoiceStore } from '../../stores/voiceStore'
import { ScreenSharePicker, type ShareSelection } from './ScreenSharePicker'

export function VoiceControlBar(): React.JSX.Element {
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant()
  const { micMuted, deafened, toggleMic, toggleDeafen } = useVoiceStore()
  const [pickerOpen, setPickerOpen] = useState(false)

  async function stopShare(): Promise<void> {
    try {
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
      <button className={micMuted ? 'round-button round-button--off' : 'round-button'} title="Mutar" onClick={toggleMic}>
        <MicIcon off={micMuted} size={22} />
      </button>
      <button className={deafened ? 'round-button round-button--off' : 'round-button'} title="Ensurdecer" onClick={toggleDeafen}>
        <HeadsetIcon off={deafened} size={22} />
      </button>
      <button
        className={isScreenShareEnabled ? 'round-button round-button--live' : 'round-button'}
        title={isScreenShareEnabled ? 'Parar de compartilhar' : 'Compartilhar tela'}
        onClick={onShareClick}
      >
        🖥️
      </button>
      <button className="round-button round-button--danger" title="Sair da call" onClick={() => void voiceSession.leave()}>
        📞
      </button>
      {pickerOpen && <ScreenSharePicker onCancel={() => setPickerOpen(false)} onConfirm={(selection) => void startShare(selection)} />}
    </div>
  )
}

function logShareFailure(error: unknown): void {
  console.error(JSON.stringify({ event: 'screen_share_failed', message: String(error) }))
}
