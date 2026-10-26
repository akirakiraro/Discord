import { AudioTrack, useTracks } from '@livekit/components-react'
import type { TrackReference } from '@livekit/components-core'
import { RemoteTrackPublication, Track, type Room, type TrackPublication } from 'livekit-client'
import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { reportAppError } from '../../lib/report/reportAppError'
import {
  asBoostGraph,
  connectListenerBoost,
  ensureCallAudioContext,
  holdRemoteForBoost,
  readCallAudioContext,
  retuneListenerBoost,
  type HeldRemote,
  type ListenerBoost,
} from '../../lib/voice/listenerBoost'
import {
  directListenVolume,
  hearsRemoteIdentity,
  listenerGain,
  listenerPlayback,
} from '../../lib/voice/listenerVolume'
import { voiceRoom } from '../../lib/voice/voiceSession'
import { useListenerVolumeStore } from '../../stores/listenerVolumeStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useVoiceStore } from '../../stores/voiceStore'

/**
 * Toca o áudio remoto da call. Em 100% é o elemento, como o RoomAudioRenderer.
 * Acima disso o ganho fica neste aparelho, no contexto que a sala já abriu.
 * Exemplo: `<CallPlayback deafened={false} />` enquanto a call está aberta.
 */
export function CallPlayback({ deafened }: { deafened: boolean }): React.JSX.Element {
  const tracks = useTracks([Track.Source.Microphone, Track.Source.ScreenShareAudio, Track.Source.Unknown], {
    onlySubscribed: true,
    updateOnlyOn: [],
  }).filter((track) => hearsRemoteIdentity(track.participant.identity, track.participant.isLocal))
  return (
    <div style={{ display: 'none' }}>
      {tracks.map((track) => (
        <RemoteCallTrack key={track.publication.trackSid} trackRef={track} deafened={deafened} />
      ))}
    </div>
  )
}

function RemoteCallTrack({ trackRef, deafened }: { trackRef: TrackReference; deafened: boolean }): React.JSX.Element {
  if (trackRef.source === Track.Source.Microphone) return <PersonMicrophone trackRef={trackRef} deafened={deafened} />
  if (trackRef.source === Track.Source.ScreenShareAudio) return <ScreenListen trackRef={trackRef} deafened={deafened} />
  return <AudioTrack trackRef={trackRef} volume={deafened ? 0 : 1} muted={deafened} />
}

function PersonMicrophone({ trackRef, deafened }: { trackRef: TrackReference; deafened: boolean }): React.JSX.Element {
  const localUserId = useSessionStore((store) => store.session?.user.id ?? '')
  const gain = useListenerVolumeStore((store) => listenerGain(store.file, localUserId, trackRef.participant.identity))
  if (listenerPlayback(gain, deafened) === 'boost') return <BoostedMicrophone trackRef={trackRef} gain={gain} />
  const volume = deafened ? 0 : directListenVolume(gain)
  return <AudioTrack trackRef={trackRef} volume={volume} muted={deafened} />
}

function ScreenListen({ trackRef, deafened }: { trackRef: TrackReference; deafened: boolean }): React.JSX.Element {
  const volume = useVoiceStore((store) => store.screenAudioVolume)
  return <AudioTrack trackRef={trackRef} volume={deafened ? 0 : volume} muted={deafened} />
}

function BoostedMicrophone({ trackRef, gain }: { trackRef: TrackReference; gain: number }): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  const element = useRef<HTMLAudioElement>(null)
  useListenerBoost(trackRef, gain, element, () => setFailed(true))
  if (failed) return <AudioTrack trackRef={trackRef} volume={1} muted={false} />
  return <audio ref={element} autoPlay muted />
}

function useListenerBoost(
  trackRef: TrackReference,
  gain: number,
  element: MutableRefObject<HTMLAudioElement | null>,
  onFail: () => void,
): void {
  const gainRef = useRef(gain)
  const chainRef = useRef<ListenerBoost | null>(null)
  const failRef = useRef(onFail)
  gainRef.current = gain
  failRef.current = onFail
  const media = trackRef.publication.track
  useEffect(() => watchBoost(trackRef.publication, media, element.current, gainRef, chainRef, () => failRef.current()), [media, trackRef.publication])
  useEffect(() => retuneBoost(chainRef.current, gain), [gain])
}

function watchBoost(
  publication: TrackPublication,
  track: Track | undefined,
  element: HTMLAudioElement | null,
  gainRef: MutableRefObject<number>,
  chainRef: MutableRefObject<ListenerBoost | null>,
  onFail: () => void,
): () => void {
  enableRemote(publication)
  return bindBoost(track, element, gainRef, chainRef, onFail)
}

function bindBoost(
  track: Track | undefined,
  element: HTMLAudioElement | null,
  gainRef: MutableRefObject<number>,
  chainRef: MutableRefObject<ListenerBoost | null>,
  onFail: () => void,
): () => void {
  if (!track || !element || track.kind !== Track.Kind.Audio) return () => undefined
  const run: BoostRun = { stopped: false, release: () => undefined }
  void openBoost(track, element, gainRef)
    .then((opened) => takeOpened(run, opened, chainRef, gainRef))
    .catch((error: unknown) => failBoost(run.stopped, error, onFail))
  return () => haltOpened(run, chainRef)
}

interface BoostRun {
  stopped: boolean
  release: () => void
}

function takeOpened(run: BoostRun, opened: OpenedBoost, chainRef: MutableRefObject<ListenerBoost | null>, gainRef: MutableRefObject<number>): void {
  run.release = opened.release
  keepBoost(run.stopped, opened, chainRef, gainRef)
}

function haltOpened(run: BoostRun, chainRef: MutableRefObject<ListenerBoost | null>): void {
  releaseBoost(chainRef, () => {
    run.stopped = true
  })
  run.release()
}

interface OpenedBoost {
  chain: ListenerBoost
  release: () => void
}

async function openBoost(track: Track, element: HTMLAudioElement, gainRef: MutableRefObject<number>): Promise<OpenedBoost> {
  const held = holdRemoteForBoost(track, element)
  return finishBoost(held, gainRef)
}

async function finishBoost(held: HeldRemote, gainRef: MutableRefObject<number>): Promise<OpenedBoost> {
  try {
    const context = await ensureCallAudioContext(asCallRoom(voiceRoom))
    const chain = connectListenerBoost(asBoostGraph(context), held.stream, gainRef.current)
    return { chain, release: held.release }
  } catch (error) {
    held.release()
    throw error
  }
}

function keepBoost(stopped: boolean, opened: OpenedBoost, chainRef: MutableRefObject<ListenerBoost | null>, gainRef: MutableRefObject<number>): void {
  if (stopped) {
    opened.chain.disconnect()
    opened.release()
    return
  }
  chainRef.current = opened.chain
  retuneBoost(opened.chain, gainRef.current)
}

function retuneBoost(chain: ListenerBoost | null, gain: number): void {
  if (!chain) return
  const context = readCallAudioContext(asCallRoom(voiceRoom))
  if (!context) return
  retuneListenerBoost(chain, gain, context.currentTime)
}

function failBoost(stopped: boolean, error: unknown, onFail: () => void): void {
  if (stopped) return
  const message = error instanceof Error ? error.message : String(error)
  reportAppError(`Volume da pessoa: ${message}`)
  onFail()
}

function releaseBoost(chainRef: MutableRefObject<ListenerBoost | null>, markStopped: () => void): void {
  markStopped()
  chainRef.current?.disconnect()
  chainRef.current = null
}

function enableRemote(publication: TrackPublication): void {
  if (publication instanceof RemoteTrackPublication) publication.setEnabled(true)
}

function asCallRoom(room: Room): { startAudio(): Promise<void>; audioContext?: AudioContext } {
  return room as unknown as { startAudio(): Promise<void>; audioContext?: AudioContext }
}
