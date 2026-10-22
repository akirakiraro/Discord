import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { app, desktopCapturer, ipcMain, screen, type WebContents } from 'electron'
import { mixPcm, parseWindowLines, pidsOnDisplay, windowHandle } from '../shared/screenAudioTargets'
import { activeScreenSourceId } from './screenShareSources'
import { screenAudioLog } from './screenAudioLog'

const FRAME = 3840
const PREROLL_BYTES = 48000 * 2 * 2 * 0.3
const captures: ChildProcessWithoutNullStreams[] = []
let sender: WebContents | null = null
let pending: Buffer[] = []
let meter = emptyMeter()
let meterTimer: NodeJS.Timeout | null = null
let skipped = 0

/**
 * Liga o áudio isolado da última tela escolhida e corta quando o renderer pede.
 * Exemplo: `exposeScreenAudioIpc()` depois que o app estiver pronto.
 */
export function exposeScreenAudioIpc(): void {
  ipcMain.handle('radcord:screen-audio-start', (event) => startScreenAudio(event.sender))
  ipcMain.handle('radcord:screen-audio-stop', () => stopScreenAudio())
}

export function stopScreenAudio(): void {
  if (captures.length > 0) screenAudioLog('capture_stopped', meter)
  for (const child of captures) child.kill()
  captures.length = 0
  pending = []
  sender = null
  meter = emptyMeter()
  skipped = 0
  if (meterTimer) clearInterval(meterTimer)
  meterTimer = null
}

async function startScreenAudio(target: WebContents): Promise<void> {
  stopScreenAudio()
  const sourceId = activeScreenSourceId()
  if (!sourceId) throw new Error('nenhuma tela escolhida para o áudio')
  const pids = await pidsFor(sourceId)
  if (pids.length === 0) throw new Error(`sem processo de áudio para ${sourceId}`)
  sender = target
  pending = pids.map(() => Buffer.alloc(0))
  meter = emptyMeter()
  const names = await Promise.all(pids.map(processName))
  screenAudioLog('capture_started', { sourceId, pids, names })
  pids.forEach((pid, index) => captures.push(spawnCapture(pid, index)))
  meterTimer = setInterval(() => {
    screenAudioLog('capture_meter', { ...meter })
    meter.peak = 0
    meter.maxGapMs = 0
  }, 1000)
  target.once('destroyed', stopScreenAudio)
}

function spawnCapture(pid: number, index: number): ChildProcessWithoutNullStreams {
  const child = spawn(loopbackExe(), ['capture', String(pid)], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.on('data', (chunk: Buffer) => pushPcm(index, chunk))
  child.stderr.on('data', (chunk: Buffer) => {
    screenAudioLog('capture_stderr', { pid, message: chunk.toString().trim() })
  })
  return child
}

function pushPcm(index: number, chunk: Buffer): void {
  if (!pending[index]) return
  const audible = withoutPreroll(chunk)
  if (!audible.length) return
  noteMeter(audible)
  pending[index] = Buffer.concat([pending[index], audible])
  drainMixer()
}

function withoutPreroll(chunk: Buffer): Buffer {
  if (skipped >= PREROLL_BYTES) return chunk
  const take = Math.min(chunk.length, PREROLL_BYTES - skipped)
  skipped += take
  if (skipped === take) screenAudioLog('preroll_dropped', { bytes: skipped, peak: pcmPeak(chunk.subarray(0, take)) })
  return chunk.subarray(take)
}

function noteMeter(chunk: Buffer): void {
  const now = Date.now()
  if (meter.lastAt > 0) meter.maxGapMs = Math.max(meter.maxGapMs, now - meter.lastAt)
  meter.lastAt = now
  meter.chunks += 1
  meter.bytes += chunk.length
  meter.peak = Math.max(meter.peak, pcmPeak(chunk))
}

function pcmPeak(chunk: Buffer): number {
  let peak = 0
  for (let offset = 0; offset + 1 < chunk.length; offset += 32) {
    peak = Math.max(peak, Math.abs(chunk.readInt16LE(offset)))
  }
  return peak
}

function emptyMeter(): CaptureMeter {
  return { chunks: 0, bytes: 0, peak: 0, maxGapMs: 0, lastAt: 0 }
}

interface CaptureMeter {
  chunks: number
  bytes: number
  peak: number
  maxGapMs: number
  lastAt: number
}

function processName(pid: number): Promise<string> {
  return new Promise((resolve) => {
    execFile('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { windowsHide: true }, (_error, stdout) => {
      resolve(stdout.split(',')[0]?.replaceAll('"', '').trim() || 'desconhecido')
    })
  })
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
