import { describe, expect, it } from 'vitest'
import { CALL_CHIME_DEDUPE_MS } from './callChime'
import { CallChimeGate, type CallChimePlayerPort, type CallSoundPrefs } from './callChimeGate'

class ManualSoon {
  private queue: Array<() => void> = []

  soon(run: () => void): void {
    this.queue.push(run)
  }

  flush(): void {
    const pending = this.queue.splice(0, this.queue.length)
    for (const run of pending) run()
  }
}

class RecordingPlayer implements CallChimePlayerPort {
  readonly played: string[] = []
  fail = false

  prime(): void {
    if (this.fail) throw new Error('sem contexto')
  }

  play(kind: string): void {
    if (this.fail) throw new Error('alto-falante')
    this.played.push(kind)
  }
}

function harness(prefs: CallSoundPrefs = { callSounds: true, callSoundVolume: 0.7 }, silenced = false) {
  const soon = new ManualSoon()
  const player = new RecordingPlayer()
  let now = 0
  let mute = silenced
  const gate = new CallChimeGate({
    prefs: () => prefs,
    silenced: () => mute,
    sinkId: () => null,
    now: () => now,
    soon: (run) => soon.soon(run),
    player,
    dedupeMs: CALL_CHIME_DEDUPE_MS,
  })
  return {
    gate,
    player,
    soon,
    setNow: (value: number) => {
      now = value
    },
    setSilenced: (value: boolean) => {
      mute = value
    },
  }
}

describe('CallChimeGate', () => {
  it('entrar toca só o próprio som quando a sala já tem gente', () => {
    const { gate, player } = harness()

    gate.onJoined(['ana', 'bob:monitor'])
    gate.onRemote('join', 'ana')
    gate.onRemote('join', 'bob:monitor')

    expect(player.played, 'sem rajada de quem já estava').toEqual(['join'])
  })

  it('outra pessoa entra na hora e sai depois do turno', () => {
    const { gate, player, soon } = harness()
    gate.onJoined([])

    gate.onRemote('join', 'bia')
    gate.onRemote('leave', 'bia')
    expect(player.played, 'a saída espera o fim do turno').toEqual(['join', 'join'])

    soon.flush()
    expect(player.played).toEqual(['join', 'join', 'leave'])
  })

  it('reconexão do LiveKit não toca a sala inteira, e quem não volta toca uma saída', () => {
    const { gate, player, soon } = harness()
    gate.onJoined([])
    gate.onRemote('join', 'ana')
    gate.onRemote('join', 'bob')

    gate.holdReconnect()
    gate.onRemote('leave', 'ana')
    gate.onRemote('leave', 'bob')
    soon.flush()
    gate.releaseReconnect(['ana'])
    gate.onRemote('join', 'ana')

    expect(player.played, 'ana voltou muda; bob saiu de verdade').toEqual(['join', 'join', 'join', 'leave'])
  })

  it('sair da call cancela a rajada de desconexão e toca uma saída', () => {
    const { gate, player, soon } = harness()
    gate.onJoined(['ana'])

    gate.onLeft()
    gate.onRemote('leave', 'ana')
    soon.flush()

    expect(player.played).toEqual(['join', 'leave'])
  })

  it('trocar de canal toca a saída e a entrada, sem quem já está no canal novo', () => {
    const { gate, player } = harness()
    gate.onJoined(['ana'])

    gate.onLeft()
    gate.onJoined(['carol'])

    expect(player.played).toEqual(['join', 'leave', 'join'])
  })

  it('chave desligada, surdo, monitor e erro do alto-falante não quebram a call', () => {
    const prefs = { callSounds: false, callSoundVolume: 0.7 }
    const off = harness(prefs)
    off.gate.onJoined([])
    off.gate.onRemote('join', 'ana')
    expect(off.player.played).toEqual([])

    const deaf = harness()
    deaf.setSilenced(true)
    deaf.gate.onJoined([])
    deaf.gate.onRemote('join', 'bia')
    expect(deaf.player.played).toEqual([])

    const broken = harness()
    broken.player.fail = true
    expect(() => broken.gate.prime()).not.toThrow()
    expect(() => broken.gate.onJoined([])).not.toThrow()
  })

  it('a mesma identidade não toca de novo dentro da janela', () => {
    const { gate, player, soon, setNow } = harness()
    gate.onJoined([])
    gate.onRemote('join', 'cai')
    setNow(1_000)
    gate.onRemote('leave', 'cai')
    soon.flush()
    setNow(1_400)
    gate.onRemote('join', 'cai')

    expect(player.played).toEqual(['join', 'join', 'leave'])
  })
})
