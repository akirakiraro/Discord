/**
 * @vitest-environment happy-dom
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserDto } from '@radcord/shared'
import { HearMyself } from './HearMyself'
import { startLocalEar } from '../../lib/voice/localEar'
import { startServerEar } from '../../lib/voice/serverEar'
import { voiceRoom, voiceSession } from '../../lib/voice/voiceSession'
import { useSessionStore, type AuthSession } from '../../stores/sessionStore'
import { useVoiceStore } from '../../stores/voiceStore'

vi.mock('../../lib/voice/serverEar', () => ({
  startServerEar: vi.fn(async () => () => undefined),
  unlockEarOutput: vi.fn(),
}))

vi.mock('../../lib/voice/localEar', async () => {
  const actual = await vi.importActual<typeof import('../../lib/voice/localEar')>('../../lib/voice/localEar')
  return { ...actual, startLocalEar: vi.fn(async () => () => undefined) }
})

const user: UserDto = { id: 'u1', username: 'akira', displayName: 'Akira', createdAt: '2026-01-01T00:00:00.000Z' }

describe('Me ouvir', () => {
  let root: Root | null = null

  beforeEach(() => {
    vi.mocked(startServerEar).mockClear()
    vi.mocked(startLocalEar).mockClear()
    useVoiceStore.setState({ connection: null, micMuted: false, deafened: false, lastError: null })
    useSessionStore.setState({
      session: {
        token: 'sess',
        user,
        api: { requestVoiceToken: vi.fn(async () => ({ token: 'monitor', livekitUrl: 'ws://host:7880' })) } as unknown as AuthSession['api'],
      },
    })
  })

  afterEach(() => {
    act(() => root?.unmount())
    root = null
    vi.restoreAllMocks()
  })

  it('na call abre e fecha a escuta sem recapturar o microfone publicado', async () => {
    useVoiceStore.setState({ connection: { channelId: 'canal', token: 'tok', livekitUrl: 'ws://host:7880' } })
    const published = vi.spyOn(voiceRoom.localParticipant, 'setMicrophoneEnabled')
    const monitor = vi.spyOn(voiceSession, 'setSelfMonitor')
    const button = await renderButton()

    await click(button)
    await click(button)

    expect(monitor.mock.calls.map((call) => call[0])).toEqual([true, false])
    expect(startServerEar).toHaveBeenCalledTimes(1)
    expect(startLocalEar, 'na call a escuta não abre outro getUserMedia').not.toHaveBeenCalled()
    expect(published, 'o botão não republica a faixa').not.toHaveBeenCalled()
  })

  it('fora da call usa a escuta local e não mexe na faixa publicada', async () => {
    const published = vi.spyOn(voiceRoom.localParticipant, 'setMicrophoneEnabled')
    const monitor = vi.spyOn(voiceSession, 'setSelfMonitor')
    const button = await renderButton()

    await click(button)
    await click(button)

    expect(startLocalEar).toHaveBeenCalledTimes(1)
    expect(startServerEar).not.toHaveBeenCalled()
    expect(monitor).not.toHaveBeenCalled()
    expect(published).not.toHaveBeenCalled()
  })

  async function renderButton(): Promise<HTMLButtonElement> {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(<HearMyself />)
    })
    const button = host.querySelector('button')
    if (!button) throw new Error('botão Me ouvir ausente; esperado o texto Me ouvir')
    return button
  }
})

async function click(button: HTMLButtonElement): Promise<void> {
  await act(async () => {
    button.click()
    await Promise.resolve()
    await Promise.resolve()
  })
}
