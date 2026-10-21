import { describe, expect, it, vi } from 'vitest'
import { installBlockUpdate, updatesFeedUrl, type BlockUpdateClient } from './desktopUpdate'

function client(offer: { version: string } | null): BlockUpdateClient {
  return {
    setFeedURL: vi.fn(),
    checkForUpdates: vi.fn<() => Promise<{ version: string } | null>>().mockResolvedValue(offer),
    downloadUpdate: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    quitAndInstall: vi.fn(),
  }
}

describe('updatesFeedUrl', () => {
  it('aponta a pasta /updates do host e recusa caminho extra', () => {
    expect(updatesFeedUrl('http://26.186.21.58:3000/')).toBe('http://26.186.21.58:3000/updates')
    expect(() => updatesFeedUrl('http://26.186.21.58:3000/updates')).toThrow(/\/updates/)
  })
})

describe('installBlockUpdate', () => {
  it('não consulta o host no app de desenvolvimento', async () => {
    const updater = client({ version: '0.1.39' })

    await expect(installBlockUpdate({
      packaged: false,
      baseUrl: 'http://26.186.21.58:3000',
      confirm: vi.fn<(version: string) => Promise<boolean>>(),
      client: updater,
    })).resolves.toBe('skipped')
    expect(updater.setFeedURL).not.toHaveBeenCalled()
  })

  it('baixa os blocos e reinicia quando a pessoa aceita', async () => {
    const updater = client({ version: '0.1.39' })
    const confirm = vi.fn<(version: string) => Promise<boolean>>().mockResolvedValue(true)

    await expect(installBlockUpdate({
      packaged: true,
      baseUrl: 'http://26.186.21.58:3000',
      confirm,
      client: updater,
    })).resolves.toBe('installed')
    expect(updater.setFeedURL).toHaveBeenCalledWith('http://26.186.21.58:3000/updates')
    expect(updater.downloadUpdate).toHaveBeenCalledOnce()
    expect(updater.quitAndInstall).toHaveBeenCalledOnce()
  })

  it('não baixa quando a pessoa recusa', async () => {
    const updater = client({ version: '0.1.39' })

    await expect(installBlockUpdate({
      packaged: true,
      baseUrl: 'http://26.186.21.58:3000',
      confirm: vi.fn<(version: string) => Promise<boolean>>().mockResolvedValue(false),
      client: updater,
    })).resolves.toBe('declined')
    expect(updater.downloadUpdate).not.toHaveBeenCalled()
  })

  it('fica em silêncio quando o host não responde', async () => {
    const updater = client(null)
    updater.checkForUpdates = vi.fn<() => Promise<{ version: string } | null>>().mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(installBlockUpdate({
      packaged: true,
      baseUrl: 'http://26.186.21.58:3000',
      confirm: vi.fn<(version: string) => Promise<boolean>>(),
      client: updater,
    })).resolves.toBe('unavailable')
  })
})
