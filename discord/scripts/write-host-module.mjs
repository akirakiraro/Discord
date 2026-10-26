import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const root = resolve(flag('--root') ?? join(here, '..'))
const appData = flag('--appdata') ?? process.env.APPDATA
const tsxLoader = join(root, 'node_modules', 'tsx', 'dist', 'loader.mjs')

if (!existsSync(tsxLoader)) {
  console.error('Não encontrei o tsx. Na pasta do repositório, rode npm install.')
  process.exit(1)
}

const manifest = {
  version: 1,
  repoRoot: root,
  livekitExe: join(root, 'infra', 'host', 'bin', 'livekit-server.exe'),
  serverEntry: join(root, 'apps', 'server', 'src', 'index.ts'),
  serverDir: join(root, 'apps', 'server'),
  tsxLoader,
  nodeExe: process.execPath,
  firewallScript: join(root, 'infra', 'host', 'open-firewall.ps1'),
  logDir: join(root, 'infra', 'host', 'logs'),
  dataDir: join(root, 'infra', 'host', 'data'),
  generatedDir: join(root, 'infra', 'host', 'generated'),
  databasePath: join(root, 'infra', 'host', 'data', 'radcord.db'),
}

const destination = join(root, 'infra', 'host', 'host-module.json')
writeJson(destination, manifest)
console.log(`Manifesto gravado em ${destination}`)

if (appData) {
  const copy = join(appData, 'Radcord', 'host-module.json')
  writeJson(copy, manifest)
  console.log(`Cópia para o app em ${copy}`)
}

function flag(name) {
  const index = args.indexOf(name)
  if (index < 0) return undefined
  return args[index + 1]
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}
