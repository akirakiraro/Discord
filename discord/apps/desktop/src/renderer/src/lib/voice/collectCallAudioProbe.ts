import { Track, type LocalAudioTrack, type Room } from 'livekit-client'
import { isMonitorIdentity } from '@radcord/shared'
import {
  buildCallAudioProbe,
  captureFromSettings,
  type CaptureSettings,
  type ProbeBuildResult,
  type ProbeCarry,
  type ProbeDirection,
  type ProbeLegInput,
  type ProbeMemory,
} from './callAudioProbe'
import type { MicChainReading, SourceBags } from './probeChain'
import { flattenStats } from './rtcAudioLeg'

export interface ProbeTrack {
  kind: string
  sid?: string
  getRTCStatsReport(): Promise<{ forEach(fn: (stat: object, id: string) => void): void } | undefined>
  getSourceTrackSettings?(): object
}

export interface ProbePerson {
  key: string
  name: string
  identity: string
  direction: ProbeDirection
  track: ProbeTrack
  capture: boolean
}

export interface ProbeExtras {
  chain: MicChainReading | null
  volumes: Array<{ name: string; percent: number }>
}

interface ProbePublication {
  track?: ProbeTrack
}

export interface ProbeParticipant {
  identity: string
  name?: string
  getTrackPublication(source: Track.Source): ProbePublication | undefined
}

export interface ProbeRoom {
  localParticipant: ProbeParticipant
  remoteParticipants: { values(): Iterable<ProbeParticipant> }
}

/**
 * A escuta invisível não é uma pessoa da call.
 * Exemplo: `includeRemoteMic('u1:monitor')` é `false`.
 */
export function includeRemoteMic(identity: string): boolean {
  if (identity.trim() === '') return false
  return !isMonitorIdentity(identity)
}

/**
 * Lê as faixas desta sala e devolve o painel. Não envia nada.
 * Exemplo: `await sampleCallAudioProbe(voiceRoom, hold, Date.now(), { chain: null, volumes: [] })`.
 */
export function sampleCallAudioProbe(
  room: Room,
  hold: ProbeCarry & { memory: ProbeMemory },
  nowMs: number,
  extras: ProbeExtras,
): Promise<ProbeBuildResult> {
  return readProbeSnapshot(probePeople(asProbeRoom(room)), nowMs, hold.memory, {
    ...hold,
    chain: extras.chain,
    volumes: extras.volumes,
    source: readLocalSource(room),
  })
}

/**
 * Uma leitura, já separada da sala, para o teste não precisar do LiveKit.
 * Exemplo: `await readProbeSnapshot(people, 1000, {})`.
 */
export async function readProbeSnapshot(
  people: ProbePerson[],
  nowMs: number,
  memory: ProbeMemory,
  carry?: ProbeCarry,
): Promise<ProbeBuildResult> {
  const gathered = await Promise.all(people.map((person) => readPerson(person)))
  return buildCallAudioProbe({
    legs: gathered.map((item) => item.leg),
    capture: firstCapture(gathered),
    nowMs,
    memory,
    carry,
  })
}

/** Quem tem microfone nesta sala, a própria publicação inclusive. */
export function probePeople(room: ProbeRoom): ProbePerson[] {
  const local = personOf(room.localParticipant, 'enviado', true)
  const remote = [...room.remoteParticipants.values()].map((participant) => personOf(participant, 'recebido', false))
  return [local, ...remote].filter((person): person is ProbePerson => person !== null)
}

async function readPerson(person: ProbePerson): Promise<{ leg: ProbeLegInput; capture: CaptureSettings | null }> {
  const report = await person.track.getRTCStatsReport().catch(() => undefined)
  return { leg: legOf(person, flattenStats(report)), capture: person.capture ? captureFromSettings(readCapture(person.track)) : null }
}

function legOf(person: ProbePerson, stats: ProbeLegInput['stats']): ProbeLegInput {
  return { key: person.key, name: person.name, direction: person.direction, stats }
}

function readCapture(track: ProbeTrack): object | null {
  if (!track.getSourceTrackSettings) return null
  return track.getSourceTrackSettings()
}

function firstCapture(gathered: Array<{ capture: CaptureSettings | null }>): CaptureSettings | null {
  return gathered.find((item) => item.capture)?.capture ?? null
}

function personOf(participant: ProbeParticipant, direction: ProbeDirection, capture: boolean): ProbePerson | null {
  if (direction === 'recebido' && !includeRemoteMic(participant.identity)) return null
  const track = micTrack(participant)
  if (!track) return null
  return { key: `${direction}:${track.sid || participant.identity}`, name: participant.name || participant.identity, identity: participant.identity, direction, track, capture }
}

function micTrack(participant: ProbeParticipant): ProbeTrack | null {
  const track = participant.getTrackPublication(Track.Source.Microphone)?.track
  if (!track || track.kind !== Track.Kind.Audio) return null
  return track
}

function asProbeRoom(room: Room): ProbeRoom {
  return room as unknown as ProbeRoom
}

function readLocalSource(room: Room): SourceBags | null {
  const track = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track
  if (!track || track.kind !== Track.Kind.Audio) return null
  return bagsOf(track as LocalAudioTrack)
}

function bagsOf(track: LocalAudioTrack): SourceBags {
  const media = sourceMedia(track)
  return {
    settings: track.getSourceTrackSettings(),
    constraints: constraintsOf(track, media),
    capabilities: capabilitiesOf(media),
    device: deviceOf(track.getSourceTrackSettings(), media),
  }
}

function sourceMedia(track: LocalAudioTrack): MediaStreamTrack | undefined {
  // O processador substitui mediaStreamTrack. O original continua neste campo interno.
  const hidden = track as unknown as { _mediaStreamTrack?: MediaStreamTrack }
  return hidden._mediaStreamTrack
}

function constraintsOf(track: LocalAudioTrack, media: MediaStreamTrack | undefined): object {
  const applied = media && typeof media.getConstraints === 'function' ? media.getConstraints() : {}
  if (Object.keys(applied).length > 0) return applied
  return track.constraints ?? {}
}

function capabilitiesOf(media: MediaStreamTrack | undefined): object {
  if (!media || typeof media.getCapabilities !== 'function') return {}
  try {
    return media.getCapabilities()
  } catch {
    return {}
  }
}

function deviceOf(settings: MediaTrackSettings, media: MediaStreamTrack | undefined): string | null {
  const id = settings.deviceId
  const label = media?.label
  if (label && id) return `${label} (${id})`
  return label || id || null
}
