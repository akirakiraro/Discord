import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { app, desktopCapturer, ipcMain, screen, type WebContents } from 'electron'
import { mixPcm, parseWindowLines, pidsOnDisplay, windowHandle } from '../shared/screenAudioTargets'
import { activeScreenSourceId } from './screenShareSources'

const FRAME = 3840
const captures: ChildProcessWithoutNullStreams[] = []
let sender: WebContents | null = null
let pending: Buffer[] = []

/**
 * Liga o áudio isolado da última tela escolhida e corta quando o renderer pede.
 * Exemplo: `exposeScreenAudioIpc()` depois que o app estiver pronto.
 */
export function exposeScreenAudioIpc(): void {
  ipcMain.handle('radcord:screen-audio-start', (event) => startScreenAudio(event.sender))
  ipcMain.handle('radcord:screen-audio-stop', () => stopScreenAudio())
}

export function stopScreenAudio(): void {
  for (const child of captures) child.kill()
  captures.length = 0
  pending = []
  sender = null
}

async function startScreenAudio(target: WebContents): Promise<void> {
  stopScreenAudio()
  const sourceId = activeScreenSourceId()
  if (!sourceId) throw new Error('nenhuma tela escolhida para o áudio')
  const pids = await pidsFor(sourceId)
  if (pids.length === 0) throw new Error(`sem processo de áudio para ${sourceId}`)
  sender = target
  pending = pids.map(() => Buffer.alloc(0))
  pids.forEach((pid, index) => captures.push(spawnCapture(pid, index)))
  target.once('destroyed', stopScreenAudio)
}

function spawnCapture(pid: number, index: number): ChildProcessWithoutNullStreams {
  const child = spawn(loopbackExe(), ['capture', String(pid)], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.on('data', (chunk: Buffer) => pushPcm(index, chunk))
  child.stderr.on('data', (chunk: Buffer) => {
    console.error(JSON.stringify({ event: 'screen_audio_failed', pid, message: chunk.toString().trim() }))
  })
  return child
}

function pushPcm(index: number, chunk: Buffer): void {
  if (!pending[index]) return
  pending[index] = Buffer.concat([pending[index], chunk])
  drainMixer()
}

function drainMixer(): void {
  while (pending.every((chunk) => chunk.length >= FRAME)) {
    const slices = pending.map((chunk) => chunk.subarray(0, FRAME))
    pending = pending.map((chunk) => chunk.subarray(FRAME))
    if (sender && !sender.isDestroyed()) sender.send('radcord:screen-audio-pcm', mixPcm(slices))
  }
}

async function pidsFor(sourceId: string): Promise<number[]> {
  const handle = windowHandle(sourceId)
  if (handle) return withoutSelf([await pidOf(handle)])
  return withoutSelf(await pidsOnChosenScreen(sourceId)).slice(0, 8)
}

async function pidsOnChosenScreen(sourceId: string): Promise<number[]> {
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } })
  const source = sources.find((item) => item.id === sourceId)
  const display = screen.getAllDisplays().find((item) => String(item.id) === source?.display_id)
  if (!display) return []
  const listed = parseWindowLines(await helperText(['windows']))
  return pidsOnDisplay(listed, display.bounds, display.scaleFactor, new Set([process.pid]))
}

async function pidOf(handle: string): Promise<number> {
  const text = await helperText(['pid', handle])
  const pid = Number(text.trim())
  return Number.isInteger(pid) ? pid : 0
}

function withoutSelf(pids: number[]): number[] {
  return [...new Set(pids.filter((pid) => pid > 0 && pid !== process.pid))]
}

function helperText(args: string[]): Promise<string> {
  const child = spawn(loopbackExe(), args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  return new Promise((resolve, reject) => {
    const out: Buffer[] = []
    child.stdout.on('data', (chunk: Buffer) => out.push(chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(out).toString('utf8'))
      else reject(new Error(`RadcordLoopback ${args.join(' ')} saiu com código ${code}`))
    })
  })
}

function loopbackExe(): string {
  const candidates = [
    join(app.getAppPath(), 'resources/loopback/RadcordLoopback.exe'),
    join(process.resourcesPath, 'loopback/RadcordLoopback.exe'),
  ]
  const found = candidates.find((candidate) => existsSync(candidate))
  if (!found) throw new Error(`RadcordLoopback.exe ausente; esperado em ${candidates.join(' ou ')}`)
  return found
}
