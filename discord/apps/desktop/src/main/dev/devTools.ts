import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { parseDevBotAction, parseDevBotAddRequest, type DevBotView } from '../../shared/devBots'
import { nodeImportSpecifier } from '../host/hostLaunch'
import { TestBotManager, type BotProcess } from './testBots'

/**
 * Área de testes do `npm run desktop`. O `index.ts` só importa isto dentro de
 * `if (import.meta.env.DEV)`, então o instalador não leva este arquivo.
 * Exemplo: `bindDevTools()`.
 */
export function bindDevTools(): void {
  const manager = new TestBotManager(spawnTestBot, publishBots)
  ipcMain.handle('radcord:dev-bots', () => manager.view())
  ipcMain.handle('radcord:dev-bot-add', (_event, body: unknown) => {
    const request = parseDevBotAddRequest(body)
    if (!request) throw new Error('pedido de bot inválido; esperado { apiUrl, session, channelId }')
    return manager.add(request)
  })
  ipcMain.handle('radcord:dev-bot-act', (_event, number: unknown, body: unknown) => {
    const action = parseDevBotAction(body)
    if (typeof number !== 'number' || !action) throw new Error('ação de bot inválida')
    return manager.act(number, action)
  })
  ipcMain.handle('radcord:dev-bot-pick-wav', async () => {
    const picked = await dialog.showOpenDialog({ title: 'WAV para o bot tocar', filters: [{ name: 'WAV PCM 16 bits', extensions: ['wav'] }], properties: ['openFile'] })
    return picked.canceled ? null : (picked.filePaths[0] ?? null)
  })
  app.on('will-quit', () => manager.killAll())
}

function publishBots(bots: DevBotView[]): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('radcord:dev-bots-state', bots)
  }
}

/** Raiz do monorepo (`discord/`). No dev, o app roda de `apps/desktop`. */
function repoRoot(): string {
  return resolve(app.getAppPath(), '../..')
}

function spawnTestBot(env: Record<string, string>): BotProcess {
  const root = repoRoot()
  // O `npm run desktop` passa o node do npm; o `process.execPath` aqui é o Electron.
  const node = process.env.npm_node_execpath || 'node'
  const loader = nodeImportSpecifier(resolve(root, 'node_modules/tsx/dist/loader.mjs'))
  const child = spawn(node, ['--import', loader, resolve(root, 'apps/test-bot/src/index.ts')], {
    cwd: resolve(root, 'apps/test-bot'),
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  })
  return {
    write: (line) => {
      if (child.stdin.writable) child.stdin.write(`${line}\n`)
    },
    kill: () => {
      if (child.exitCode === null) child.kill()
    },
    onStdoutLine: (listener) => void createInterface({ input: child.stdout }).on('line', listener),
    onStderrLine: (listener) => void createInterface({ input: child.stderr }).on('line', listener),
    onExit: (listener) => {
      child.on('exit', listener)
      child.on('error', (error) => {
        listener(null)
        console.error(JSON.stringify({ event: 'dev_bot_spawn_failed', message: error.message }))
      })
    },
  }
}
