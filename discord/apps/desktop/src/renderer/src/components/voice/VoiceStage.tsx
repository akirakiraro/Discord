import { AudioTrack, VideoTrack, useParticipants, useTracks } from '@livekit/components-react'
import { isMonitorIdentity } from '@radcord/shared'
import { Track, type Participant } from 'livekit-client'
import { useEffect } from 'react'
import { applyScreenVolume, type VolumeTrack } from '../../lib/voice/screenAudioVolume'
import { warmScreenAudio } from '../../lib/voice/screenAudioPump'
import { visibleScreenShares } from '../../lib/voice/visibleScreenShares'
import { useVoiceStore } from '../../stores/voiceStore'
import { ScreenVolumeSlider } from './ScreenVolumeSlider'
import { LocalScreenAudio } from './LocalScreenAudio'
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

function asVolumeTrack(track: Track | undefined): VolumeTrack | undefined {
  if (track && 'setVolume' in track) return track
  return undefined
}

function RemoteScreenAudio(): React.JSX.Element | null {
  const tracks = useTracks([Track.Source.ScreenShareAudio])
  const volume = useVoiceStore((store) => store.screenAudioVolume)
  const deafened = useVoiceStore((store) => store.deafened)
  const level = deafened ? 0 : volume
  const remote = tracks.filter((track) => !track.participant.isLocal)

  useEffect(() => {
    for (const track of remote) applyScreenVolume(asVolumeTrack(track.publication.track), level)
  }, [remote, level])

  const local = tracks.filter((track) => track.participant.isLocal)
  if (remote.length === 0 && local.length === 0) return null

  return (
    <>
      {local.map((track) => (
        <LocalScreenAudio key={track.publication.trackSid} trackRef={track} volume={level} />
      ))}
      {remote.map((track) => (
        <AudioTrack key={track.publication.trackSid} trackRef={track} volume={level} />
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
      <ScreenVolumeSlider />
    </div>
  )
}

function TileCollapse(): React.JSX.Element {
  const showOwnTile = useVoiceStore((store) => store.showOwnTile)
  const toggleOwnTile = useVoiceStore((store) => store.toggleOwnTile)
  const title = showOwnTile ? 'Ocultar usuários' : 'Mostrar usuários'

  return (
    <button className="tile-collapse" title={title} onClick={toggleOwnTile}>
      <ChevronIcon down={showOwnTile} />
    </button>
  )
}

function ChevronIcon({ down }: { down: boolean }): React.JSX.Element {
  return (
    <svg width="22" height="22" viewBox="0 0 18 18" aria-hidden="true">
      <path d={down ? 'M4 7 L9 12 L14 7' : 'M4 11 L9 6 L14 11'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function VoiceStage(): React.JSX.Element {
  const showOwnTile = useVoiceStore((store) => store.showOwnTile)
  const screenTracks = useTracks([Track.Source.ScreenShare])
  const anyoneSharing = screenTracks.length > 0
  const participants = useParticipants().filter((participant) => !isMonitorIdentity(participant.identity))
  const tiles = !anyoneSharing || showOwnTile ? participants : []
  const stageClass = anyoneSharing && tiles.length === 0 ? 'voice-stage voice-stage--strip-hidden' : 'voice-stage'
  useEffect(() => warmScreenAudio(), [])

  return (
    <div className={stageClass}>
      <ScreenShares />
      <RemoteScreenAudio />
      {anyoneSharing && <TileCollapse />}
      {tiles.length > 0 && (
        <div className="participant-grid">
          {tiles.map((participant) => (
            <ParticipantTile key={participant.identity} participant={participant} />
          ))}
        </div>
      )}
      <VoiceControlBar />
    </div>
  )
}
