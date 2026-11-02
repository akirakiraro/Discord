/**
 * Mutação local. Não entra no CI.
 * Exemplo: `npm run test:mutation` na pasta `discord/`.
 * Um alvo só: `STRYKER_TARGET=server npm exec stryker run -- --mutate apps/server/src/config.ts`
 */
const server = process.env.STRYKER_TARGET === 'server'

const desktop = [
  'apps/desktop/src/renderer/src/lib/voice/**/*.ts',
  '!apps/desktop/src/renderer/src/lib/voice/**/*.test.ts',
  'apps/desktop/src/renderer/src/stores/**/*.ts',
  '!apps/desktop/src/renderer/src/stores/**/*.test.ts',
  'apps/desktop/src/renderer/src/lib/chat/**/*.ts',
  '!apps/desktop/src/renderer/src/lib/chat/**/*.test.ts',
  'apps/desktop/src/renderer/src/lib/update/**/*.ts',
  '!apps/desktop/src/renderer/src/lib/update/**/*.test.ts',
  'apps/desktop/src/main/desktopUpdate.ts',
]

const api = [
  'apps/server/src/config.ts',
  'apps/server/src/realtime/**/*.ts',
  '!apps/server/src/realtime/**/*.test.ts',
  '!apps/server/src/realtime/**/*.integration.test.ts',
  'apps/server/src/messages/**/*.ts',
  '!apps/server/src/messages/**/*.test.ts',
  'apps/server/src/channels/**/*.ts',
  '!apps/server/src/channels/**/*.test.ts',
  'apps/server/src/auth/**/*.ts',
  '!apps/server/src/auth/**/*.test.ts',
  'apps/server/src/http/**/*.ts',
  '!apps/server/src/http/**/*.test.ts',
  'apps/server/src/updates/releasePoller.ts',
  'apps/server/src/users/**/*.ts',
  '!apps/server/src/users/**/*.test.ts',
]

export default {
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',
  plugins: ['@stryker-mutator/vitest-runner'],
  vitest: { dir: server ? 'apps/server' : 'apps/desktop', related: true },
  mutate: server ? api : desktop,
  concurrency: 4,
  timeoutMS: 20000,
  reporters: ['clear-text', 'json'],
  jsonReporter: { fileName: server ? 'reports/mutation/server.json' : 'reports/mutation/desktop.json' },
  ignorePatterns: ['reports/mutation', '.stryker-tmp', '**/release/**', '**/out/**', '**/dist/**'],
  disableTypeChecks: true,
  symlinkNodeModules: true,
}
