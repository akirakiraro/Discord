import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Button } from './Button'
import { BUTTON_PAIRS, cssButtonProblems, lowContrastPairs, unstyledButtons } from './buttonTheme'

const renderer = join(process.cwd(), 'src/renderer')

describe('botões do tema', () => {
  it('cada variante passa de 4.5:1 no descanso, hover e desabilitado', () => {
    expect(lowContrastPairs(BUTTON_PAIRS)).toEqual([])
  })

  it('o CSS das variantes repete esses pares e o renderer não tem fundo claro', () => {
    const css = readTree(renderer, '.css').map((file) => readFileSync(file, 'utf8')).join('\n')
    const buttons = readFileSync(join(renderer, 'src/styles/buttons.css'), 'utf8')

    for (const pair of BUTTON_PAIRS) {
      if (pair.name === 'ghost' || pair.name.startsWith('round') || pair.name.startsWith('icon')) continue
      expect(buttons).toContain(pair.background)
      expect(buttons).toContain(pair.color)
    }
    expect(cssButtonProblems(css)).toEqual([])
    expect(cssButtonProblems('button.cru { color: #fff; background: #f0f0f0; }').join('\n')).toContain('fundo claro')
    expect(cssButtonProblems('button.cru { color: white; }').join('\n')).toContain('texto branco')
  })

  it('todo <button> do renderer tem uma classe do tema', () => {
    const problems = readTree(renderer, '.tsx').flatMap((file) => unstyledButtons(readFileSync(file, 'utf8'), file))

    expect(problems).toEqual([])
    expect(unstyledButtons('<button type="button" className="button">Ok</button>', 'Host.tsx')).toEqual([
      'Host.tsx: <button> sem variante do tema',
    ])
    expect(unstyledButtons('<button className="button button--secondary">Ok</button>', 'Host.tsx')).toEqual([])
  })

  it('o componente pinta a variante, inclusive desabilitado', () => {
    expect(renderToStaticMarkup(createElement(Button, { variant: 'primary' }, 'Ligar'))).toContain('class="button button--primary"')
    expect(renderToStaticMarkup(createElement(Button, { variant: 'danger', disabled: true }, 'Desligar'))).toContain('disabled')
    expect(renderToStaticMarkup(createElement(Button, null, 'Cancelar'))).toContain('button--secondary')
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
