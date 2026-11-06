import { beforeEach, describe, expect, it } from 'vitest'
import { useVoiceStore } from '../../stores/voiceStore'
import { clickDeafen, clickMute, type ToggleSoundPlayer } from './micToggleClick'
import type { ToggleSound } from './micToggleSound'

class RecordingPlayer implements ToggleSoundPlayer {
  readonly heard: ToggleSound[] = []
  micMutedAtPlay: boolean[] = []

  play(kind: ToggleSound): void {
    this.heard.push(kind)
    this.micMutedAtPlay.push(useVoiceStore.getState().micMuted)
  }
}

class BrokenPlayer implements ToggleSoundPlayer {
  play(): void {
    throw new Error('sem saída')
  }
}

describe('micToggleClick', () => {
  beforeEach(() => {
    useVoiceStore.setState({ micMuted: false, deafened: false, micMutedBeforeDeafen: false })
  })

  it('mutar toca antes de fechar o microfone e o segundo clique desmuta', () => {
    const player = new RecordingPlayer()

    clickMute(player)
    clickMute(player)

    expect(player.heard).toEqual(['mute', 'unmute'])
    expect(player.micMutedAtPlay).toEqual([false, true])
    expect(useVoiceStore.getState()).toMatchObject({ micMuted: false, deafened: false })
  })

  it('ensurdecer toca a descida e a volta devolve o mute que já estava', () => {
    const player = new RecordingPlayer()
    useVoiceStore.setState({ micMuted: true })

    clickDeafen(player)
    clickDeafen(player)

    expect(player.heard).toEqual(['deafen', 'undeafen'])
    expect(useVoiceStore.getState()).toMatchObject({ micMuted: true, deafened: false })
  })

  it('o microfone, com surdo ligado, toca a volta e abre os dois', () => {
    const player = new RecordingPlayer()
    clickDeafen(player)

    clickMute(player)

    expect(player.heard).toEqual(['deafen', 'undeafen'])
    expect(useVoiceStore.getState()).toMatchObject({ micMuted: false, deafened: false })
  })

  it('bip que falha ainda alterna o botão', () => {
    clickMute(new BrokenPlayer())

    expect(useVoiceStore.getState().micMuted).toBe(true)
  })
})
