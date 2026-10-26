import { spawnSync } from 'node:child_process'

for (const target of ['desktop', 'server']) {
  const run = spawnSync('npx', ['stryker', 'run'], {
    stdio: 'inherit',
    env: { ...process.env, STRYKER_TARGET: target },
    shell: process.platform === 'win32',
  })
  if (run.status !== 0) process.exit(run.status ?? 1)
}
