import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { missingIconSelectLocks } from './iconSelect'

const styles = join(process.cwd(), 'src/renderer/src/styles')

describe('ícones fora da seleção', () => {
  it('o CSS trava ícone, emoji e avatar e deixa o texto da mensagem', () => {
    const css = readTree(styles, '.css').map((file) => readFileSync(file, 'utf8')).join('\n')

    expect(missingIconSelectLocks(css)).toEqual([])
  })

  it('reclama se o cadeado sair ou se a mensagem for travada', () => {
    const open = '.icon-button { color: #f2f3f5; }'
    const blocked = '.message__content { user-select: none; -webkit-user-drag: none; }'

    expect(missingIconSelectLocks(open).join('\n')).toContain('.icon-button sem user-select: none')
    expect(missingIconSelectLocks(blocked).join('\n')).toContain('.message__content não devia ter user-select: none')
  })
})

function readTree(dir: string, extension: string): string[] {
  const files: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) files.push(...readTree(path, extension))
    else if (path.endsWith(extension)) files.push(path)
  }
  return files
}
