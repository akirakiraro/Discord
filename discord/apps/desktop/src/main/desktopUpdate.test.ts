import { describe, expect, it, vi } from 'vitest'
import { GITHUB_UPDATE_FEED, installBlockUpdate, type BlockUpdateClient } from './desktopUpdate'

function client(offer: { version: string } | null): BlockUpdateClient {
  return {
    setFeed: vi.fn(),
    checkForUpdates: vi.fn<() => Promise<{ version: string } | null>>().mockResolvedValue(offer),
    downloadUpdate: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    quitAndInstall: vi.fn(),
  }
}

const CONFIRM = vi.fn<(version: string) => Promise<boolean>>()

describe('installBlockUpdate', () => {
  it('não consulta o GitHub no app de desenvolvimento', async () => {
    const updater = client({ version: '0.1.2' })

    await expect(installBlockUpdate({ packaged: false, confirm: CONFIRM, client: updater })).resolves.toBe('skipped')
    expect(updater.setFeed).not.toHaveBeenCalled()
  })

  it('baixa os blocos do release e reinicia quando a pessoa aceita', async () => {
    const updater = client({ version: '0.1.2' })
    const confirm = vi.fn<(version: string) => Promise<boolean>>().mockResolvedValue(true)

    await expect(installBlockUpdate({ packaged: true, confirm, client: updater })).resolves.toBe('installed')
    expect(updater.setFeed).toHaveBeenCalledWith(GITHUB_UPDATE_FEED)
    expect(updater.downloadUpdate).toHaveBeenCalledOnce()
    expect(updater.quitAndInstall).toHaveBeenCalledOnce()
  })

  it('não baixa quando a pessoa recusa', async () => {
    const updater = client({ version: '0.1.2' })

    await expect(installBlockUpdate({
      packaged: true,
      confirm: vi.fn<(version: string) => Promise<boolean>>().mockResolvedValue(false),
      client: updater,
    })).resolves.toBe('declined')
    expect(updater.downloadUpdate).not.toHaveBeenCalled()
  })

  it('fica em silêncio quando o GitHub não responde', async () => {
    const updater = client(null)
    updater.checkForUpdates = vi.fn<() => Promise<{ version: string } | null>>().mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(installBlockUpdate({ packaged: true, confirm: CONFIRM, client: updater })).resolves.toBe('unavailable')
  })
})
