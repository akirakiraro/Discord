import type { TrackReference } from '@livekit/components-core'
import { useEffect, useRef } from 'react'

interface LocalScreenAudioProps {
  trackRef: TrackReference
  volume: number
}

/**
 * Toca o áudio da própria tela para quem está compartilhando.
 * Exemplo: `<LocalScreenAudio trackRef={track} volume={0.4} />`
 */
export function LocalScreenAudio({ trackRef, volume }: LocalScreenAudioProps): React.JSX.Element {
  const element = useRef<HTMLAudioElement>(null)
  const media = trackRef.publication.track

  useEffect(() => {
    const audio = element.current
    if (!audio || !media) return undefined
    media.attach(audio)
    return () => {
      media.detach(audio)
    }
  }, [media])

  useEffect(() => {
    if (element.current) element.current.volume = volume
    window.radcord?.logScreenAudio('local_monitor', { volume })
  }, [volume, media])

  return <audio ref={element} autoPlay />
}
