import { afterEach, describe, expect, it, vi } from 'vitest'
import { updateBlocksLogin, type UpdateProgress, type UpdateSnapshot } from '../shared/desktopUpdateSnapshot'
import {
  GITHUB_UPDATE_FEED,
  INSTALL_PAUSE_MS,
  DesktopUpdateMachine,
  armQuitAndInstall,
  describeUpdateFailure,
  hostDefersUpdateMessage,
  type BlockUpdateClient,
} from './desktopUpdate'

class FakeBlockUpdateClient implements BlockUpdateClient {
  feed: GithubFeed | null = null
  offer: { version: string } | null = { version: '0.1.117' }
  checkError: Error | null = null
  checks = 0
  downloads = 0
  installed = 0
  downloadImpl: (() => Promise<void>) | null = null
  private progressListener: ((progress: UpdateProgress) => void) | null = null
  private errorListener: ((message: string) => void) | null = null
  private downloadedListener: ((version: string) => void) | null = null

  setFeed(feed: GithubFeed): void {
    this.feed = feed
  }

  checkForUpdates(): Promise<{ version: string } | null> {
    this.checks += 1
    if (this.checkError) return Promise.reject(this.checkError)
    return Promise.resolve(this.offer)
  }

  downloadUpdate(): Promise<void> {
    this.downloads += 1
    if (this.downloadImpl) return this.downloadImpl()
    return Promise.resolve()
  }

  quitAndInstall(): void {
    this.installed += 1
  }

  onDownloadProgress(listener: (progress: UpdateProgress) => void): void {
    this.progressListener = listener
  }

  onUpdateError(listener: (message: string) => void): void {
    this.errorListener = listener
  }

  onUpdateDownloaded(listener: (version: string) => void): void {
    this.downloadedListener = listener
  }

  emitProgress(progress: UpdateProgress): void {
    this.progressListener?.(progress)
  }

  emitError(message: string): void {
    this.errorListener?.(message)
  }

  emitDownloaded(version: string): void {
    this.downloadedListener?.(version)
  }
}

type GithubFeed = typeof GITHUB_UPDATE_FEED

function packaged(client: FakeBlockUpdateClient, installedVersion = '0.1.116'): DesktopUpdateMachine {
  return new DesktopUpdateMachine({ packaged: true, installedVersion, client })
}

async function untilPhase(machine: DesktopUpdateMachine, phase: UpdateSnapshot['phase']): Promise<void> {
  for (let attempt = 0; attempt < 20 && machine.view().phase !== phase; attempt += 1) {
    await Promise.resolve()
  }
}

describe('DesktopUpdateMachine', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('baixa a release e só reinicia quando a pessoa confirma no app', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const client = new FakeBlockUpdateClient()
    const machine = packaged(client)

    await machine.start()
    machine.install()
    machine.install()

    expect(client.feed).toEqual(GITHUB_UPDATE_FEED)
    expect(client.downloads, 'um download').toBe(1)
    expect(machine.view()).toMatchObject({ phase: 'installing', version: '0.1.117' })
    expect(updateBlocksLogin(machine.view()), 'instalando continua sem login').toBe(true)
    expect(client.installed, 'a tela precisa aparecer antes de fechar').toBe(0)
    await machine.requestCheck()
    expect(machine.view().phase, 'um retry no meio da instalação não recomeça').toBe('installing')
    expect(client.checks).toBe(1)

    await vi.advanceTimersByTimeAsync(INSTALL_PAUSE_MS)
    expect(client.installed, 'o segundo OK não dispara outro instalador').toBe(1)
  })

  it('libera o login quando não há release mais nova', async () => {
    const client = new FakeBlockUpdateClient()
    client.offer = null
    const machine = packaged(client)

    await machine.start()

    expect(machine.view().phase).toBe('current')
    expect(updateBlocksLogin(machine.view())).toBe(false)
    expect(client.downloads).toBe(0)
    machine.install()
    expect(client.installed).toBe(0)
  })

  it('fica bloqueado quando o GitHub não responde e tenta de novo', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const client = new FakeBlockUpdateClient()
    client.checkError = new Error('ENOTFOUND api.github.com')
    const machine = packaged(client)

    await machine.start()

    expect(machine.view().phase).toBe('error')
    expect(machine.view().message).toMatch(/Sem conexão/)
    expect(updateBlocksLogin(machine.view()), 'falha não libera o login').toBe(true)

    client.checkError = null
    client.offer = null
    await machine.requestCheck()

    expect(machine.view().phase).toBe('current')
    expect(client.checks).toBe(2)
  })

  it('trata limite do GitHub e falha de download sem liberar o login', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const limited = new FakeBlockUpdateClient()
    limited.checkError = new Error('HTTP 403 rate limit exceeded')
    const limitedMachine = packaged(limited)
    await limitedMachine.start()
    expect(limitedMachine.view().message).toMatch(/limitou/)
    expect(updateBlocksLogin(limitedMachine.view())).toBe(true)

    const download = new FakeBlockUpdateClient()
    download.downloadImpl = () => Promise.reject(new Error('net::ERR_INTERNET_DISCONNECTED'))
    const downloadMachine = packaged(download)
    await downloadMachine.start()
    expect(downloadMachine.view().phase).toBe('error')
    expect(downloadMachine.view().message).toMatch(/Sem conexão/)
    expect(updateBlocksLogin(downloadMachine.view())).toBe(true)
  })

  it('publica o progresso do download', async () => {
    const client = new FakeBlockUpdateClient()
    const seen: UpdateSnapshot[] = []
    const machine = new DesktopUpdateMachine({
      packaged: true,
      installedVersion: '0.1.116',
      client,
      onChange: (snapshot) => seen.push(snapshot),
    })
    client.downloadImpl = async () => {
      client.emitProgress({ percent: 140, bytesPerSecond: -1, transferred: 400, total: 1000 })
    }

    await machine.start()

    const progress = seen.find((snapshot) => snapshot.phase === 'downloading' && snapshot.progress !== null)
    expect(progress?.progress).toEqual({ percent: 100, bytesPerSecond: 0, transferred: 400, total: 1000 })
    expect(machine.view().phase).toBe('ready')
  })

  it('mostra pronto quando o evento de download termina antes da promessa', async () => {
    const client = new FakeBlockUpdateClient()
    let finish = (): void => undefined
    client.downloadImpl = () => new Promise((resolve) => {
      client.emitDownloaded('0.1.130')
      finish = resolve
    })
    const machine = packaged(client)

    const pending = machine.start()
    await untilPhase(machine, 'ready')
    expect(machine.view().version).toBe('0.1.130')
    finish()
    await pending
    expect(machine.view().phase).toBe('ready')
  })

  it('ignora versão anunciada que não é maior que a instalada', async () => {
    const client = new FakeBlockUpdateClient()
    client.offer = null
    const machine = packaged(client, '0.1.116')
    await machine.start()

    await machine.announce('0.1.116')
    await machine.announce('v0.1.100')
    await machine.announce('beta')
    expect(client.checks, 'igual ou menor não consulta de novo').toBe(1)

    client.offer = { version: '0.1.118' }
    await machine.announce('v0.1.118')
    expect(machine.view()).toMatchObject({ phase: 'ready', version: '0.1.118' })
    expect(client.checks).toBe(2)
  })

  it('não consulta o GitHub no app de desenvolvimento', async () => {
    const client = new FakeBlockUpdateClient()
    const machine = new DesktopUpdateMachine({ packaged: false, installedVersion: '0.1.116', client })

    expect(machine.view().phase).toBe('skipped')
    expect(updateBlocksLogin(machine.view())).toBe(false)
    await machine.start()
    await machine.announce('9.9.9')
    await machine.requestCheck()

    expect(client.checks).toBe(0)
    expect(client.feed).toBeNull()
    expect(machine.view().phase).toBe('skipped')
  })

  it('não baixa de novo enquanto o download está em andamento', async () => {
    const client = new FakeBlockUpdateClient()
    let finish = (): void => undefined
    client.downloadImpl = () => new Promise((resolve) => {
      finish = resolve
    })
    const machine = packaged(client)

    const pending = machine.start()
    await untilPhase(machine, 'downloading')
    machine.install()
    await machine.requestCheck()

    expect(client.installed, 'ainda não está pronto').toBe(0)
    expect(client.checks).toBe(1)
    finish()
    await pending
  })
})

describe('atualização com o host ligado', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('não fecha o app e volta a instalar quando o host desliga', async () => {
    vi.useFakeTimers()
    const client = new FakeBlockUpdateClient()
    let hostOn = true
    const machine = new DesktopUpdateMachine({
      packaged: true,
      installedVersion: '0.1.129',
      client,
      blocksInstall: () => hostOn,
    })

    await machine.start()
    machine.install()

    expect(client.downloads).toBe(1)
    expect(client.installed).toBe(0)
    expect(machine.view()).toEqual({
      phase: 'deferred',
      version: '0.1.117',
      progress: null,
      message: hostDefersUpdateMessage('0.1.117'),
    })
    expect(updateBlocksLogin(machine.view())).toBe(false)
    expect(hostDefersUpdateMessage('0.1.117')).toBe(
      'O host ligado por este app adia a instalação da versão 0.1.117. Desligue o host para instalar. Instalar agora fecharia o app e derrubaria a call.',
    )

    await machine.requestCheck()
    expect(client.checks, 'não baixa de novo enquanto espera').toBe(1)

    hostOn = false
    machine.reconsiderInstall()
    expect(machine.view().phase).toBe('ready')
    machine.install()
    expect(machine.view().phase).toBe('installing')
    await vi.advanceTimersByTimeAsync(INSTALL_PAUSE_MS)
    expect(client.installed).toBe(1)
  })
})

describe('describeUpdateFailure', () => {
  it('diferencia checagem e download quando o erro não é de rede', () => {
    expect(describeUpdateFailure('socket hang up', 'check')).toMatch(/verificar/)
    expect(describeUpdateFailure('socket hang up', 'download')).toMatch(/download/)
    expect(describeUpdateFailure('ENOTFOUND', 'check')).toContain('SoundRoom')
    expect(describeUpdateFailure('ENOTFOUND', 'check')).not.toContain('Radcord')
  })
})

describe('armQuitAndInstall', () => {
  it('instala em silêncio e pede --force-run para o NSIS reabrir o app', () => {
    const quitAndInstall = vi.fn()
    const updater = { autoRunAppAfterInstall: false, quitAndInstall }

    armQuitAndInstall(updater)

    expect(INSTALL_PAUSE_MS, 'a tela de instalando fica tempo bastante para ser lida').toBe(1500)
    expect(updater.autoRunAppAfterInstall, 'só entra se um dia a chamada deixar de ser silenciosa').toBe(true)
    expect(quitAndInstall).toHaveBeenCalledWith(true, true)
  })
})
