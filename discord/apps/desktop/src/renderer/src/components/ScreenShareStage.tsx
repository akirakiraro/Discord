import { VideoTrack, useLocalParticipant, useTracks } from '@livekit/components-react'
import { Track, type ScreenShareCaptureOptions } from 'livekit-client'

// Áudio da tela desligado: o loopback do Windows também captura a voz dos amigos
// tocando no Radcord e quem assiste ouviria eco. Resolver na fase 4.
const SCREEN_SHARE_OPTIONS: ScreenShareCaptureOptions = {
  audio: false,
  contentHint: 'motion',
  resolution: { width: 1920, height: 1080, frameRate: 30 },
}

export function ScreenShareStage(): React.JSX.Element {
  const remoteScreens = useTracks([Track.Source.ScreenShare]).filter((track) => !track.participant.isLocal)

  return (
    <main className="stage">
      <header className="stage__header">🔊 Sala de voz</header>
      <div className="stage__screens">
        {remoteScreens.length === 0 && <p className="stage__empty">Ninguém está compartilhando a tela agora.</p>}
        {remoteScreens.map((track) => (
          <figure key={track.publication.trackSid} className="stage__screen">
            <VideoTrack trackRef={track} />
            <figcaption>{track.participant.name || track.participant.identity}</figcaption>
          </figure>
        ))}
      </div>
      <ScreenShareButton />
    </main>
  )
}

function ScreenShareButton(): React.JSX.Element {
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant()

  async function toggleScreenShare(): Promise<void> {
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled, SCREEN_SHARE_OPTIONS)
    } catch (error) {
      console.error(JSON.stringify({ event: 'screen_share_failed', message: String(error) }))
    }
  }

  return (
    <div className="stage__controls">
      {isScreenShareEnabled && <span className="badge badge--live">Você está compartilhando a tela</span>}
      <button className="button button--primary" onClick={() => void toggleScreenShare()}>
        {isScreenShareEnabled ? 'Parar de compartilhar' : '🖥️ Compartilhar tela'}
      </button>
    </div>
  )
}
