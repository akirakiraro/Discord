import { ipcMain } from 'electron'

/**
 * Diagnóstico da captura desligado. Não grava `screen-audio.log`.
 * O formato das linhas, se for religado, está em `docs/audio-tela.md`.
 * Exemplo: `screenAudioLog('capture_started', { pids: [1] })`.
 */
export function screenAudioLog(_event: string, _detail: Record<string, unknown>): void {}

/** Recebe o relato do renderer. Exemplo: `exposeScreenAudioLog()` no app pronto. */
export function exposeScreenAudioLog(): void {
  ipcMain.on('radcord:screen-audio-log', (_event, payload: unknown) => {
    if (!isLogPayload(payload)) return
    screenAudioLog(payload.event, payload.detail ?? {})
  })
}

function isLogPayload(payload: unknown): payload is { event: string; detail?: Record<string, unknown> } {
  if (!payload || typeof payload !== 'object') return false
  const event = (payload as { event?: unknown }).event
  return typeof event === 'string'
}
