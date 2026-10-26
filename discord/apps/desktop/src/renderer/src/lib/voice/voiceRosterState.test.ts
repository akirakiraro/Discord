import { describe, expect, it } from 'vitest'
import { monitorIdentity } from '@radcord/shared'
import {
  EMPTY_VOICE_ROSTER,
  occupantsInChannel,
  sidebarVoiceRows,
  withVoiceJoined,
  withVoiceLeft,
  withVoiceSnapshot,
  type VoiceRosterState,
} from './voiceRosterState'

const AKIRA = { channelId: 'geral', userId: 'u-1', displayName: 'Akira' }
const BIA = { channelId: 'geral', userId: 'u-2', displayName: 'Bia' }

function joined(state: VoiceRosterState, occupant: typeof AKIRA): VoiceRosterState {
  return withVoiceJoined(state, occupant)
}

describe('voiceRosterState', () => {
  it('o snapshot substitui quem ficou na memória, para quem abre o app no meio da call', () => {
    const stale = joined(EMPTY_VOICE_ROSTER, { channelId: 'antigo', userId: 'fantasma', displayName: 'Fantasma' })

    const next = withVoiceSnapshot(stale, { occupants: [AKIRA, BIA] })

    expect(next.occupants).toEqual([AKIRA, BIA])
    expect(occupantsInChannel(next, 'geral').map((occupant) => occupant.userId)).toEqual(['u-1', 'u-2'])
    expect(occupantsInChannel(next, 'antigo')).toEqual([])
  })

  it('entrada tira a pessoa do canal anterior e a saída atrasada desse canal não apaga a nova', () => {
    const inGeral = joined(joined(EMPTY_VOICE_ROSTER, AKIRA), BIA)
    const moved = joined(inGeral, { ...AKIRA, channelId: 'outro' })

    const afterStaleLeft = withVoiceLeft(moved, { channelId: 'geral', userId: 'u-1' })

    expect(occupantsInChannel(afterStaleLeft, 'outro').map((occupant) => occupant.userId)).toEqual(['u-1'])
    expect(occupantsInChannel(afterStaleLeft, 'geral').map((occupant) => occupant.userId)).toEqual(['u-2'])

    const left = withVoiceLeft(afterStaleLeft, { channelId: 'outro', userId: 'u-1' })
    expect(occupantsInChannel(left, 'outro')).toEqual([])
  })

  it('snapshot com a mesma pessoa duas vezes fica com o último canal', () => {
    const next = withVoiceSnapshot(EMPTY_VOICE_ROSTER, {
      occupants: [AKIRA, { ...AKIRA, channelId: 'outro', displayName: 'Akira' }],
    })

    expect(next.occupants).toEqual([{ ...AKIRA, channelId: 'outro', displayName: 'Akira' }])
  })

  it('fora da call ignora o LiveKit; dentro soma quem já apareceu e esconde a escuta', () => {
    const live = [
      { identity: 'u-1', name: 'Akira ao vivo' },
      { identity: 'u-3', name: 'Caio' },
      { identity: monitorIdentity('u-1'), name: 'escuta' },
    ]

    expect(sidebarVoiceRows([AKIRA], live, false)).toEqual([{ userId: 'u-1', displayName: 'Akira' }])
    expect(sidebarVoiceRows([AKIRA], live, true)).toEqual([
      { userId: 'u-1', displayName: 'Akira' },
      { userId: 'u-3', displayName: 'Caio' },
    ])
  })

  it('nome vazio do LiveKit cai no id', () => {
    expect(sidebarVoiceRows([], [{ identity: 'u-9', name: '' }], true)).toEqual([{ userId: 'u-9', displayName: 'u-9' }])
  })
})
