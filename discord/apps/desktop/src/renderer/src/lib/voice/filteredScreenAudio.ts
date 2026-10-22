import { Track, type LocalParticipant } from 'livekit-client'
import { ScreenAudioPump } from './screenAudioPump'

let pump: ScreenAudioPump | null = null

/**
 * Publica o áudio isolado da tela que acabou de ser escolhida.
 * Exemplo: `await publishFilteredScreenAudio(localParticipant)`.
 */
export async function publishFilteredScreenAudio(participant: LocalParticipant): Promise<void> {
  const bridge = window.radcord
  if (!bridge) throw new Error('ponte radcord ausente')
  await stopFilteredScreenAudio(participant)
  const next = new ScreenAudioPump()
  pump = next
  bridge.onScreenAudio((pcm) => next.push(pcm))
  try {
    await bridge.startScreenAudio()
    await participant.publishTrack(next.track, { source: Track.Source.ScreenShareAudio })
  } catch (error) {
    await stopFilteredScreenAudio(participant)
    throw error
  }
}

/**
 * Para a captura isolada e tira a faixa da sala.
 * Exemplo: `await stopFilteredScreenAudio(localParticipant)`.
 */
export async function stopFilteredScreenAudio(participant: LocalParticipant): Promise<void> {
  window.radcord?.offScreenAudio()
  await window.radcord?.stopScreenAudio()
  const publication = participant.getTrackPublication(Track.Source.ScreenShareAudio)
  if (publication?.track) await participant.unpublishTrack(publication.track)
  pump?.close()
  pump = null
}
