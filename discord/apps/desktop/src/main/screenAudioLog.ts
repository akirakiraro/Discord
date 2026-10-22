import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, ipcMain } from 'electron'

/**
 * Grava uma linha do que acontece com o áudio da tela.
 * Exemplo: `screenAudioLog('capture_started', { pids: [1] })`.
 */
export function screenAudioLog(event: string, detail: Record<string, unknown>): void {
  const line = JSON.stringify({ t: new Date().toISOString(), event, ...detail })
  for (const file of logFiles()) {
    try {
      appendFileSync(file, `${line}\n`)
    } catch (error) {
      console.error(JSON.stringify({ event: 'screen_audio_log_failed', file, message: String(error) }))
    }
  }
  console.error(line)
}

/** Recebe o relato do renderer. Exemplo: `exposeScreenAudioLog()` no app pronto. */
export function exposeScreenAudioLog(): void {
  ipcMain.on('radcord:screen-audio-log', (_event, payload: unknown) => {
    if (!isLogPayload(payload)) return
    screenAudioLog(payload.event, payload.detail ?? {})
  })
}

function logFiles(): string[] {
  return [join(app.getPath('userData'), 'screen-audio.log'), join(app.getAppPath(), 'screen-audio.log')]
}

function isLogPayload(payload: unknown): payload is { event: string; detail?: Record<string, unknown> } {
  if (!payload || typeof payload !== 'object') return false
  const event = (payload as { event?: unknown }).event
  return typeof event === 'string'
}
