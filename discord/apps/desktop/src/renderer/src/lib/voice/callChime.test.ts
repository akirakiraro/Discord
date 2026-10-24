import { describe, expect, it } from 'vitest'
import {
  CALL_CHIME_DEDUPE_MS,
  SELF_CHIME_ID,
  callChimeRole,
  emptyCallChime,
  isCallSoundSilenced,
  reduceCallChime,
  seedCallChime,
  type CallChimeEvent,
  type CallChimePolicy,
  type CallChimeState,
  type CallSoundKind,
} from './callChime'

const POLICY: CallChimePolicy = { enabled: true, silenced: false, dedupeMs: CALL_CHIME_DEDUPE_MS }

function event(kind: CallSoundKind, identity: string, at: number, local = false, role: CallChimeEvent['role'] = 'person'): CallChimeEvent {
  return { kind, identity, local, role, at }
}

function play(state: CallChimeState, next: CallChimeEvent, policy: CallChimePolicy = POLICY): CallSoundKind | null {
  return reduceCallChime(state, next, policy).play
}

describe('callChime', () => {
  it('entrada e saída da própria pessoa são sons diferentes', () => {
    const join = reduceCallChime(emptyCallChime(), event('join', SELF_CHIME_ID, 0, true), POLICY)
    const leave = reduceCallChime(join.state, event('leave', SELF_CHIME_ID, 2_000, true), POLICY)

    expect(join.play, 'entrar na call toca a subida').toBe('join')
    expect(leave.play, 'sair da call toca a descida').toBe('leave')
  })

  it('outra pessoa entrando e saindo toca o som correspondente', () => {
    const join = reduceCallChime(emptyCallChime(), event('join', 'ana', 0), POLICY)
    const leave = reduceCallChime(join.state, event('leave', 'ana', 2_000), POLICY)

    expect(join.play).toBe('join')
    expect(leave.play).toBe('leave')
  })

  it('quem já estava na sala não toca entrada, mas toca saída', () => {
    const seeded = seedCallChime(['ana', 'bob', 'bob:monitor'])

    expect(seeded.known, 'o monitor não entra na lista').toEqual(['ana', 'bob'])
    expect(play(seeded, event('join', 'ana', 10)), 'sem rajada ao entrar').toBeNull()
    expect(play(seeded, event('leave', 'bob', 20))).toBe('leave')
  })

  it('ignora monitor, faixa de tela, agente e identidade vazia', () => {
    const state = emptyCallChime()

    expect(callChimeRole('user-1:monitor'), 'escuta invisível').toBe('auxiliary')
    expect(callChimeRole('user-1', 'screen'), 'faixa de tela').toBe('screen')
    expect(callChimeRole('user-1', 4), 'agente do LiveKit').toBe('auxiliary')
    expect(callChimeRole('user-1:screen'), 'sufixo auxiliar').toBe('auxiliary')
    expect(play(state, event('join', 'user-1:monitor', 0, false, 'auxiliary'))).toBeNull()
    expect(play(state, event('leave', 'user-1', 0, false, 'screen'))).toBeNull()
    expect(play(state, event('join', '', 0, false, 'auxiliary'))).toBeNull()
  })

  it('chave desligada e surdo não tocam, mas continuam lembrando quem está na sala', () => {
    const off = reduceCallChime(emptyCallChime(), event('join', 'ana', 0), { ...POLICY, enabled: false })
    const deaf = reduceCallChime(emptyCallChime(), event('join', 'bia', 0), { ...POLICY, silenced: true })

    expect(off.play).toBeNull()
    expect(off.state.known, 'ligar a chave depois não repete a ana').toEqual(['ana'])
    expect(deaf.play).toBeNull()
    expect(isCallSoundSilenced(true)).toBe(true)
    expect(isCallSoundSilenced(false)).toBe(false)
  })

  it('reconexão rápida não repete a entrada, e uma saída logo após a entrada ainda toca', () => {
    const join = reduceCallChime(emptyCallChime(), event('join', 'ana', 0), POLICY)
    const leftQuick = reduceCallChime(join.state, event('leave', 'ana', 100), POLICY)
    const back = reduceCallChime(leftQuick.state, event('join', 'ana', 200), POLICY)
    const leftLater = reduceCallChime(back.state, event('leave', 'ana', 200 + CALL_CHIME_DEDUPE_MS), POLICY)

    expect(leftQuick.play, 'entrou e saiu de verdade').toBe('leave')
    expect(back.play, 'voltou dentro da janela: a entrada some').toBeNull()
    expect(back.state.known, 'a ana voltou, mesmo sem som').toEqual(['ana'])
    expect(leftLater.play, 'depois da janela a saída volta a tocar').toBe('leave')
  })

  it('a própria troca de canal toca saída e, em seguida, entrada', () => {
    const join = reduceCallChime(emptyCallChime(), event('join', SELF_CHIME_ID, 0, true), POLICY)
    const leave = reduceCallChime(join.state, event('leave', SELF_CHIME_ID, 100, true), POLICY)
    const next = reduceCallChime(leave.state, event('join', SELF_CHIME_ID, 200, true), POLICY)
    const repeat = reduceCallChime(next.state, event('join', SELF_CHIME_ID, 300, true), POLICY)

    expect(leave.play).toBe('leave')
    expect(next.play, 'canal novo é outro som').toBe('join')
    expect(repeat.play, 'a mesma entrada duas vezes na janela não repete').toBeNull()
  })

  it('pessoa padrão do LiveKit conta; tipo desconhecido não', () => {
    expect(callChimeRole('ana')).toBe('person')
    expect(callChimeRole('ana', 0)).toBe('person')
    expect(callChimeRole('ana', 'STANDARD')).toBe('person')
    expect(callChimeRole('ana', 7)).toBe('auxiliary')
  })
})
