import { AudioTrack, VideoTrack, useIsSpeaking, useParticipants, useTracks } from '@livekit/components-react'
import { Track, type Participant } from 'livekit-client'
import { Avatar } from '../common/Avatar'
import { useMemberFace } from './useMemberFace'
import { VoiceControlBar } from './VoiceControlBar'

function ParticipantTile({ participant }: { participant: Participant }): React.JSX.Element {
  const speaking = useIsSpeaking(participant)
  const face = useMemberFace(participant.identity, participant.name || participant.identity)

  return (
    <div className={speaking ? 'participant-tile participant-tile--speaking' : 'participant-tile'}>
      <Avatar name={face.name} seed={participant.identity} imageUrl={face.imageUrl} size={80} />
      <span className="participant-tile__name">
        {!participant.isMicrophoneEnabled && '🔇 '}
        {face.name}
      </span>
    </div>
  )
}

function RemoteScreenAudio(): React.JSX.Element | null {
  const tracks = useTracks([Track.Source.ScreenShareAudio]).filter((track) => !track.participant.isLocal)
  if (tracks.length === 0) return null

  return (
    <>
      {tracks.map((track) => (
        <AudioTrack key={track.publication.trackSid} trackRef={track} />
      ))}
    </>
  )
}

function RemoteScreenShares(): React.JSX.Element | null {
  // A própria tela fica de fora para não gerar o efeito de espelho infinito.
  const screens = useTracks([Track.Source.ScreenShare]).filter((track) => !track.participant.isLocal)
  if (screens.length === 0) return null

  return (
    <div className="screen-grid">
      {screens.map((track) => (
        <figure key={track.publication.trackSid} className="screen-grid__item">
          <VideoTrack trackRef={track} />
          <figcaption>{track.participant.name || track.participant.identity}</figcaption>
        </figure>
      ))}
    </div>
  )
}

export function VoiceStage(): React.JSX.Element {
  const participants = useParticipants()

  return (
    <div className="voice-stage">
      <RemoteScreenShares />
      <RemoteScreenAudio />
      <div className="participant-grid">
        {participants.map((participant) => (
          <ParticipantTile key={participant.identity} participant={participant} />
        ))}
      </div>
      <VoiceControlBar />
    </div>
  )
}
