import { useState } from 'react'
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react'
import { ScreenSharePresets, type AudioCaptureOptions, type RoomOptions } from 'livekit-client'
import { ChannelSidebar } from './ChannelSidebar'
import { ScreenShareStage } from './ScreenShareStage'
import type { VoiceSession } from '../lib/voiceSession'

const MICROPHONE_OPTIONS: AudioCaptureOptions = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: { screenShareEncoding: ScreenSharePresets.h1080fps30.encoding },
}

interface VoiceRoomProps {
  session: VoiceSession
  onLeave: (reason: string | null) => void
}

export function VoiceRoom({ session, onLeave }: VoiceRoomProps): React.JSX.Element {
  const [deafened, setDeafened] = useState(false)

  return (
    <LiveKitRoom
      className="voice-room"
      serverUrl={session.livekitUrl}
      token={session.token}
      audio={MICROPHONE_OPTIONS}
      options={ROOM_OPTIONS}
      onDisconnected={() => onLeave(null)}
      onError={(error) => onLeave(`Falha na conexão de voz com ${session.livekitUrl}: ${error.message}`)}
    >
      <RoomAudioRenderer muted={deafened} />
      <ChannelSidebar session={session} deafened={deafened} onToggleDeafen={() => setDeafened(!deafened)} />
      <ScreenShareStage />
    </LiveKitRoom>
  )
}
