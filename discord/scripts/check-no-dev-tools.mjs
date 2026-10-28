// Garante que o build do instalador não leva a área de testes.
// Roda depois de `npm run build -w @radcord/desktop`, na pasta `discord/`.
// Exemplo: `node scripts/check-no-dev-tools.mjs apps/desktop/out`
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/** Textos que só existem no código de testes. Achar um deles no build é vazamento. */
export const DEV_TOOLS_MARKERS = ['radcordDev', 'radcord:dev-', 'RADCORD_DEV_TOOLS', 'Bot de teste', 'test-bot', 'Área de testes', 'dev-bots']

const outDir = process.argv[2] ?? 'apps/desktop/out'

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

let all
try {
  all = files(outDir).filter((path) => /\.(js|mjs|cjs|html|css)$/.test(path))
} catch (error) {
  console.error(`check-no-dev-tools: pasta ${outDir} não existe; rode o build antes (${error.message})`)
  process.exit(2)
}
if (all.length === 0) {
  console.error(`check-no-dev-tools: nenhum arquivo em ${outDir}; esperado o build do desktop`)
  process.exit(2)
}

const leaks = all.flatMap((path) => {
  const text = readFileSync(path, 'utf8')
  return DEV_TOOLS_MARKERS.filter((marker) => text.includes(marker)).map((marker) => `${relative(outDir, path)}: ${JSON.stringify(marker)}`)
})

if (leaks.length > 0) {
  console.error('A área de testes entrou no build do instalador:')
  for (const leak of leaks) console.error(`  ${leak}`)
  process.exit(1)
}
console.log(`check-no-dev-tools: ok, ${all.length} arquivos sem a área de testes`)
