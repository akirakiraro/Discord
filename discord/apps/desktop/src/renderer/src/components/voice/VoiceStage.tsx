import { AudioTrack, VideoTrack, useParticipants, useTracks } from '@livekit/components-react'
import { isMonitorIdentity } from '@radcord/shared'
import { Track, type Participant } from 'livekit-client'
import { visibleScreenShares } from '../../lib/voice/visibleScreenShares'
import { useVoiceStore } from '../../stores/voiceStore'
import { Avatar } from '../common/Avatar'
import { useMemberFace } from './useMemberFace'
import { useSpeaking } from './useSpeaking'
import { VoiceControlBar } from './VoiceControlBar'

function ParticipantTile({ participant }: { participant: Participant }): React.JSX.Element {
  const speaking = useSpeaking(participant)
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

function shareCaption(name: string, isLocal: boolean): string {
  return isLocal ? 'Sua transmissão' : name
}

function ScreenShares(): React.JSX.Element | null {
  const showOwnShare = useVoiceStore((store) => store.showOwnShare)
  const screens = visibleScreenShares(useTracks([Track.Source.ScreenShare]), showOwnShare)
  if (screens.length === 0) return null

  return (
    <div className="screen-grid">
      {screens.map((track) => (
        <figure key={track.publication.trackSid} className="screen-grid__item">
          <VideoTrack trackRef={track} />
          <figcaption>{shareCaption(track.participant.name || track.participant.identity, track.participant.isLocal)}</figcaption>
        </figure>
      ))}
    </div>
  )
}

export function VoiceStage(): React.JSX.Element {
  const showOwnTile = useVoiceStore((store) => store.showOwnTile)
  const participants = useParticipants()
    .filter((participant) => !isMonitorIdentity(participant.identity))
    .filter((participant) => showOwnTile || !participant.isLocal)

  return (
    <div className="voice-stage">
      <ScreenShares />
      <RemoteScreenAudio />
      {participants.length > 0 && (
        <div className="participant-grid">
          {participants.map((participant) => (
            <ParticipantTile key={participant.identity} participant={participant} />
          ))}
        </div>
      )}
      <VoiceControlBar />
    </div>
  )
}
