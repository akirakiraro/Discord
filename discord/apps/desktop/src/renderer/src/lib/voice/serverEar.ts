import { monitorIdentity } from '@radcord/shared'
import { Room, RoomEvent, Track, type RemoteTrack, type RemoteTrackPublication, type RemoteParticipant } from 'livekit-client'

/**
 * Liga uma segunda conexão, invisível, que só toca o microfone deste usuário
 * depois que o áudio volta do servidor.
 * Exemplo: `const stop = await startServerEar(url, token, userId)`
 */
export async function startServerEar(url: string, token: string, userId: string): Promise<() => void> {
  assertMonitorToken(token, userId)
  const room = new Room()
  const elements: HTMLMediaElement[] = []
  const onSubscribed = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    playOwnMic(track, publication, participant, userId, elements)
  }
  room.on(RoomEvent.TrackSubscribed, onSubscribed)
  await room.connect(url, token, { autoSubscribe: false })
  subscribeOwnMic(room, userId)
  room.on(RoomEvent.TrackPublished, (publication, participant) => {
    if (isOwnMic(participant.identity, userId, publication.source)) void publication.setSubscribed(true)
  })
  return () => stopEar(room, elements)
}

/**
 * Lê o `sub` do JWT sem validar a assinatura. Serve para não conectar
 * um token da sessão principal, o que derrubaria a chamada.
 * Exemplo: `jwtSubject('aaa.' + payload + '.bbb')`
 */
export function jwtSubject(token: string): string {
  const segment = token.split('.')[1]
  if (!segment) throw new Error(`token "${token}" sem payload; esperado um JWT com três partes`)
  const json = JSON.parse(decodeBase64Url(segment)) as { sub?: unknown }
  if (typeof json.sub !== 'string' || json.sub === '') {
    throw new Error(`token sem sub; esperado a identidade do LiveKit`)
  }
  return json.sub
}

function assertMonitorToken(token: string, userId: string): void {
  const identity = jwtSubject(token)
  const expected = monitorIdentity(userId)
  if (identity !== expected) {
    throw new Error(`token de escuta com identidade "${identity}"; esperado "${expected}"`)
  }
}

function subscribeOwnMic(room: Room, userId: string): void {
  for (const participant of room.remoteParticipants.values()) {
    const publication = participant.getTrackPublication(Track.Source.Microphone)
    if (publication && isOwnMic(participant.identity, userId, publication.source)) void publication.setSubscribed(true)
  }
}

function playOwnMic(
  track: RemoteTrack,
  publication: RemoteTrackPublication,
  participant: RemoteParticipant,
  userId: string,
  elements: HTMLMediaElement[],
): void {
  if (!isOwnMic(participant.identity, userId, publication.source)) return
  const element = track.attach()
  element.hidden = true
  document.body.append(element)
  elements.push(element)
  void element.play()
}

function isOwnMic(identity: string, userId: string, source: Track.Source): boolean {
  return identity === userId && source === Track.Source.Microphone
}

function stopEar(room: Room, elements: HTMLMediaElement[]): void {
  for (const element of elements) element.remove()
  void room.disconnect()
}

function decodeBase64Url(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (normalized.length % 4)) % 4
  return atob(normalized + '='.repeat(padding))
}
