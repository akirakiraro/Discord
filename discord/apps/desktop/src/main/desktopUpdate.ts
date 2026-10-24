import { isNewerRelease } from '@radcord/shared'
import {
  SKIPPED_UPDATE,
  cleanProgress,
  type UpdatePhase,
  type UpdateProgress,
  type UpdateSnapshot,
} from '../shared/desktopUpdateSnapshot'

export interface GithubUpdateFeed {
  provider: 'github'
  owner: string
  repo: string
}

/** Releases públicos de akirakiraro/Discord. O dev não consulta isso porque o app não está empacotado. */
export const GITHUB_UPDATE_FEED: GithubUpdateFeed = {
  provider: 'github',
  owner: 'akirakiraro',
  repo: 'Discord',
}

export interface BlockUpdateClient {
  setFeed(feed: GithubUpdateFeed): void
  checkForUpdates(): Promise<{ version: string } | null>
  downloadUpdate(): Promise<void>
  quitAndInstall(): void
  onDownloadProgress(listener: (progress: UpdateProgress) => void): void
  onUpdateError(listener: (message: string) => void): void
  onUpdateDownloaded(listener: (version: string) => void): void
}

export interface UpdateMachineOptions {
  packaged: boolean
  installedVersion: string
  client: BlockUpdateClient
  onChange?: (snapshot: UpdateSnapshot) => void
}

export interface QuitInstallTarget {
  autoRunAppAfterInstall: boolean
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void
}

/**
 * NSIS oneClick reabre o Radcord quando o instalador recebe `--force-run`.
 * No electron-updater 6.8, `quitAndInstall(false, true)` ignora o segundo
 * argumento e usa `autoRunAppAfterInstall`. Ligar essa flag é o que faz o
 * instalador receber `--force-run` com `isSilent` falso.
 * Exemplo: `armQuitAndInstall(autoUpdater)`
 */
export function armQuitAndInstall(updater: QuitInstallTarget): void {
  updater.autoRunAppAfterInstall = true
  updater.quitAndInstall(false, true)
}

const NETWORK_MARKERS = [
  'err_internet_disconnected',
  'err_name_not_resolved',
  'err_connection',
  'enotfound',
  'econnrefused',
  'etimedout',
  'econnreset',
  'getaddrinfo',
  'offline',
  'network error',
] as const

const LIMIT_MARKERS = ['rate limit', 'api rate', 'status code 403', 'http 403', ' 403', '429'] as const

/**
 * Traduz a falha do electron-updater para a tela. O texto cru fica no log.
 * Exemplo: `describeUpdateFailure('ENOTFOUND', 'check')`
 */
export function describeUpdateFailure(raw: string, stage: 'check' | 'download'): string {
  const text = raw.toLowerCase()
  if (mentions(text, LIMIT_MARKERS)) return 'O GitHub limitou a consulta de atualizações. Espere um pouco e tente de novo.'
  if (mentions(text, NETWORK_MARKERS)) return 'Sem conexão para atualizar o Radcord. Confira a internet e tente de novo.'
  if (stage === 'download') return 'O download da atualização falhou. Tente de novo quando a conexão voltar.'
  return 'Não foi possível verificar a atualização do Radcord. Tente de novo.'
}

/**
 * Checagem, download e reinício do app instalado, sem diálogo nativo.
 * Exemplo: `const machine = new DesktopUpdateMachine({ packaged: true, installedVersion: '0.1.116', client })`
 */
export class DesktopUpdateMachine {
  private snapshot: UpdateSnapshot
  private busy = false
  private generation = 0
  private listening = false
  private installing = false

  constructor(private readonly options: UpdateMachineOptions) {
    this.snapshot = options.packaged ? checkingSnapshot() : SKIPPED_UPDATE
  }

  view(): UpdateSnapshot {
    return this.snapshot
  }

  /** Uma vez na abertura. No app de desenvolvimento não consulta o GitHub. */
  start(): Promise<UpdateSnapshot> {
    if (!this.options.packaged) return Promise.resolve(this.publish(SKIPPED_UPDATE))
    if (this.snapshot.phase === 'current') return Promise.resolve(this.snapshot)
    return this.requestCheck()
  }

  /** IPC manual e o botão Tentar novamente. É a mesma checagem da abertura. */
  requestCheck(): Promise<UpdateSnapshot> {
    if (this.hold()) return Promise.resolve(this.snapshot)
    return this.runCheck()
  }

  /**
   * Aviso do host. Versão igual ou menor que a instalada não dispara download.
   * Exemplo: `await machine.announce('v0.1.118')`
   */
  announce(remoteVersion: string): Promise<UpdateSnapshot> {
    if (!this.options.packaged) return Promise.resolve(this.snapshot)
    if (!isNewerRelease(remoteVersion, this.options.installedVersion)) return Promise.resolve(this.snapshot)
    if (this.busy && this.snapshot.phase === 'checking') return Promise.resolve(this.snapshot)
    return this.requestCheck()
  }

  install(): void {
    if (this.snapshot.phase !== 'ready' || this.installing) return
    this.installing = true
    this.options.client.quitAndInstall()
  }

  private hold(): boolean {
    if (!this.options.packaged) {
      this.publish(SKIPPED_UPDATE)
      return true
    }
    if (this.busy || this.snapshot.phase === 'downloading' || this.snapshot.phase === 'ready') return true
    this.busy = true
    return false
  }

  private async runCheck(): Promise<UpdateSnapshot> {
    const generation = this.beginAttempt()
    try {
      const offer = await this.readOffer()
      if (!this.sameAttempt(generation)) return this.snapshot
      if (!offer) return this.settle(generation, currentSnapshot())
      this.publish(downloadingSnapshot(offer.version))
      await this.options.client.downloadUpdate()
      if (!this.sameAttempt(generation)) return this.snapshot
      return this.settle(generation, readySnapshot(this.snapshot.version ?? offer.version))
    } catch (error: unknown) {
      return this.failAttempt(generation, readError(error))
    }
  }

  private beginAttempt(): number {
    const generation = this.generation + 1
    this.generation = generation
    this.bindClient()
    this.publish(checkingSnapshot())
    return generation
  }

  private async readOffer(): Promise<{ version: string } | null> {
    this.options.client.setFeed(GITHUB_UPDATE_FEED)
    return this.options.client.checkForUpdates()
  }

  private bindClient(): void {
    if (this.listening) return
    this.listening = true
    this.options.client.onDownloadProgress((progress) => this.noteProgress(progress))
    this.options.client.onUpdateError((message) => this.failFromEvent(message))
    this.options.client.onUpdateDownloaded((version) => this.noteDownloaded(version))
  }

  private noteProgress(progress: UpdateProgress): void {
    if (this.snapshot.phase !== 'downloading') return
    this.publish({ ...this.snapshot, progress: cleanProgress(progress) })
  }

  private noteDownloaded(version: string): void {
    if (!this.busy || this.snapshot.phase !== 'downloading') return
    this.publish(readySnapshot(version.trim() || this.snapshot.version))
  }

  private failFromEvent(message: string): void {
    if (!this.busy) return
    if (this.snapshot.phase !== 'checking' && this.snapshot.phase !== 'downloading') return
    this.generation += 1
    this.failAttempt(this.generation, message)
  }

  private failAttempt(generation: number, raw: string): UpdateSnapshot {
    if (generation !== this.generation) return this.snapshot
    const stage = failureStage(this.snapshot.phase)
    logUpdateFailure(raw, stage)
    return this.settle(generation, errorSnapshot(describeUpdateFailure(raw, stage)))
  }

  private sameAttempt(generation: number): boolean {
    return generation === this.generation
  }

  private settle(generation: number, next: UpdateSnapshot): UpdateSnapshot {
    if (generation !== this.generation) return this.snapshot
    this.busy = false
    return this.publish(next)
  }

  private publish(next: UpdateSnapshot): UpdateSnapshot {
    this.snapshot = next
    this.options.onChange?.(next)
    return next
  }
}

function mentions(text: string, needles: readonly string[]): boolean {
  return needles.some((needle) => text.includes(needle))
}

function failureStage(phase: UpdatePhase): 'check' | 'download' {
  return phase === 'downloading' || phase === 'ready' ? 'download' : 'check'
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function logUpdateFailure(message: string, stage: 'check' | 'download'): void {
  console.error(JSON.stringify({ event: 'desktop_update_failed', stage, message }))
}

function checkingSnapshot(): UpdateSnapshot {
  return { phase: 'checking', version: null, progress: null, message: null }
}

function currentSnapshot(): UpdateSnapshot {
  return { phase: 'current', version: null, progress: null, message: null }
}

function downloadingSnapshot(version: string): UpdateSnapshot {
  return { phase: 'downloading', version, progress: null, message: null }
}

function readySnapshot(version: string | null): UpdateSnapshot {
  return { phase: 'ready', version, progress: null, message: null }
}

function errorSnapshot(message: string): UpdateSnapshot {
  return { phase: 'error', version: null, progress: null, message }
}
