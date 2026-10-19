import { useLocalParticipant } from '@livekit/components-react'
import type { ScreenShareCaptureOptions } from 'livekit-client'
import { voiceSession } from '../../lib/voice/voiceSession'
import { useVoiceStore } from '../../stores/voiceStore'

// Áudio da tela desligado: o loopback do Windows também captura a voz dos amigos
// tocando no Radcord e quem assiste ouviria eco. Resolver na fase 4.
const SCREEN_SHARE_OPTIONS: ScreenShareCaptureOptions = {
  audio: false,
  contentHint: 'motion',
  resolution: { width: 1920, height: 1080, frameRate: 30 },
}

export function VoiceControlBar(): React.JSX.Element {
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant()
  const { micMuted, deafened, toggleMic, toggleDeafen } = useVoiceStore()

  async function toggleScreenShare(): Promise<void> {
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled, SCREEN_SHARE_OPTIONS)
    } catch (error) {
      console.error(JSON.stringify({ event: 'screen_share_failed', message: String(error) }))
    }
  }

  return (
    <div className="voice-controls">
      <button className={micMuted ? 'round-button round-button--off' : 'round-button'} title="Mutar" onClick={toggleMic}>
        {micMuted ? '🔇' : '🎙️'}
      </button>
      <button className={deafened ? 'round-button round-button--off' : 'round-button'} title="Ensurdecer" onClick={toggleDeafen}>
        {deafened ? '🔕' : '🎧'}
      </button>
      <button
        className={isScreenShareEnabled ? 'round-button round-button--live' : 'round-button'}
        title={isScreenShareEnabled ? 'Parar de compartilhar' : 'Compartilhar tela'}
        onClick={() => void toggleScreenShare()}
      >
        🖥️
      </button>
      <button className="round-button round-button--danger" title="Sair da call" onClick={() => void voiceSession.leave()}>
        📞
      </button>
    </div>
  )
}
