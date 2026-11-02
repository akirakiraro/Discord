export const MIN_BUTTON_CONTRAST = 4.5

export interface ButtonColorPair {
  name: string
  state: string
  background: string
  color: string
}

/** Pares usados pelas variantes, inclusive hover, ativo e desabilitado. */
export const BUTTON_PAIRS: readonly ButtonColorPair[] = [
  { name: 'primary', state: 'rest', background: '#5865f2', color: '#ffffff' },
  { name: 'primary', state: 'hover', background: '#4752c4', color: '#ffffff' },
  { name: 'primary', state: 'disabled', background: '#3c45a5', color: '#ffffff' },
  { name: 'secondary', state: 'rest', background: '#2b2d31', color: '#f2f3f5' },
  { name: 'secondary', state: 'hover', background: '#404249', color: '#f2f3f5' },
  { name: 'secondary', state: 'disabled', background: '#1e1f22', color: '#dbdee1' },
  { name: 'danger', state: 'rest', background: '#c43135', color: '#ffffff' },
  { name: 'danger', state: 'hover', background: '#a61e28', color: '#ffffff' },
  { name: 'danger', state: 'disabled', background: '#8e2429', color: '#ffffff' },
  { name: 'success', state: 'rest', background: '#23a55a', color: '#1e1f22' },
  { name: 'success', state: 'hover', background: '#2dcc6e', color: '#1e1f22' },
  { name: 'success', state: 'disabled', background: '#146b38', color: '#f2f3f5' },
  { name: 'ghost', state: 'rest', background: '#313338', color: '#f2f3f5' },
  { name: 'ghost', state: 'hover', background: '#35373c', color: '#f2f3f5' },
  { name: 'ghost', state: 'disabled', background: '#313338', color: '#dbdee1' },
  { name: 'round-live', state: 'rest', background: '#23a55a', color: '#1e1f22' },
  { name: 'round-danger', state: 'rest', background: '#c43135', color: '#ffffff' },
  { name: 'round-off', state: 'rest', background: '#404249', color: '#ffb4b6' },
  { name: 'icon-off', state: 'rest', background: '#404249', color: '#ffb4b6' },
]

export const THEME_BUTTON_CLASSES = [
  'button--primary',
  'button--secondary',
  'button--danger',
  'button--ghost',
  'button--success',
  'icon-button',
  'round-button',
  'link-button',
  'channel-item',
  'channel-category__add',
  'settings-nav__item',
  'settings-modal__close',
  'host-switch',
  'voice-status__probe',
  'audio-probe__close',
  'tile-collapse',
  'listener-volume__reset',
  'message-list__older',
  'composer__attach',
  'user-panel__identity',
  'share-source',
  'profile-modal__text',
  'message__action',
  'member',
  'participant-row__main',
] as const

const LIGHT_LUMINANCE = 0.45

/** Exemplo: `contrastRatio('#5865f2', '#ffffff')`. */
export function contrastRatio(background: string, color: string): number {
  const lighter = Math.max(luminance(background), luminance(color))
  const darker = Math.min(luminance(background), luminance(color))
  return (lighter + 0.05) / (darker + 0.05)
}

/** Exemplo: `lowContrastPairs(BUTTON_PAIRS)`. */
export function lowContrastPairs(pairs: readonly ButtonColorPair[]): string[] {
  return pairs
    .filter((pair) => contrastRatio(pair.background, pair.color) < MIN_BUTTON_CONTRAST)
    .map((pair) => `${pair.name} ${pair.state}: ${contrastRatio(pair.background, pair.color).toFixed(2)}`)
}

/**
 * Falha se o JSX tem `<button>` sem classe do tema.
 * Exemplo: `unstyledButtons(source, 'HostSettings.tsx')`.
 */
export function unstyledButtons(source: string, file: string): string[] {
  if (file.endsWith('components/ui/Button.tsx')) return []
  const problems: string[] = []
  for (const tag of buttonTags(source)) {
    const groups = classGroups(tag)
    if (!groups || groups.some((group) => !splitClasses(group).some((token) => isThemeClass(token)))) {
      problems.push(`${file}: <button> sem variante do tema`)
    }
  }
  return problems
}

/**
 * Fundo claro, texto branco sem fundo escuro, contraste baixo ou opacidade no botão.
 * Exemplo: `cssButtonProblems(css)`.
 */
export function cssButtonProblems(css: string): string[] {
  const problems: string[] = []
  for (const rule of cssRules(stripComments(css))) {
    if (!selectorIsButton(rule.selector)) continue
    const opacity = declaration(rule.body, 'opacity')
    if (opacity && opacity !== '0' && opacity !== '1') problems.push(`${rule.selector.trim()}: opacidade ${opacity} esconde o texto`)
    const background = resolvePaint(declaration(rule.body, 'background'), css)
    const color = resolvePaint(declaration(rule.body, 'color'), css)
    if (background && isLight(background)) problems.push(`${rule.selector.trim()}: fundo claro ${background}`)
    if (color && isWhite(color) && (!background || background === 'transparent')) {
      problems.push(`${rule.selector.trim()}: texto branco sem fundo escuro`)
    }
    if (background && color && background !== 'transparent' && contrastRatio(background, color) < MIN_BUTTON_CONTRAST) {
      problems.push(`${rule.selector.trim()}: contraste ${contrastRatio(background, color).toFixed(2)}`)
    }
  }
  return problems
}

function isThemeClass(token: string): boolean {
  return THEME_BUTTON_CLASSES.some((name) => token === name)
}

function buttonTags(source: string): string[] {
  const tags: string[] = []
  const start = /<button\b/g
  for (const match of source.matchAll(start)) {
    const from = match.index ?? 0
    tags.push(readTag(source, from))
  }
  return tags
}

function readTag(source: string, from: number): string {
  let braces = 0
  let quote: '"' | "'" | '`' | null = null
  for (let index = from; index < source.length; index += 1) {
    const char = source[index]
    if (quote) {
      if (char === '\\') {
        index += 1
        continue
      }
      if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '{') braces += 1
    if (char === '}') braces -= 1
    if (char === '>' && braces === 0) return source.slice(from, index + 1)
  }
  return source.slice(from)
}

function classGroups(tag: string): string[] | null {
  const at = tag.search(/className\s*=/)
  if (at < 0) return null
  let index = tag.indexOf('=', at) + 1
  while (tag[index] === ' ' || tag[index] === '\n' || tag[index] === '\r') index += 1
  const char = tag[index]
  if (char === '"' || char === "'") {
    const end = tag.indexOf(char, index + 1)
    return end < 0 ? null : [tag.slice(index + 1, end)]
  }
  if (char !== '{') return null
  const found = literals(readBalanced(tag, index))
  return found.length > 0 ? found : null
}

function readBalanced(source: string, from: number): string {
  let depth = 0
  for (let index = from; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(from, index + 1)
    }
  }
  return source.slice(from)
}

function literals(expression: string): string[] {
  const found: string[] = []
  const pattern = /'([^'\\]*)'|"([^"\\]*)"|`([^`\\]*)`/g
  for (const match of expression.matchAll(pattern)) found.push(match[1] ?? match[2] ?? match[3] ?? '')
  return found
}

function splitClasses(value: string): string[] {
  return value.split(/\s+/).filter((token) => token.length > 0)
}

interface CssRule {
  selector: string
  body: string
}

function cssRules(css: string): CssRule[] {
  const rules: CssRule[] = []
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    rules.push({ selector: match[1] ?? '', body: match[2] ?? '' })
  }
  return rules
}

function selectorIsButton(selector: string): boolean {
  if (selector.includes('scrollbar')) return false
  const tokens: string[] = selector.match(/[a-zA-Z_][a-zA-Z0-9_-]*/g) ?? []
  if (tokens.includes('button')) return true
  return THEME_BUTTON_CLASSES.some((name) => tokens.includes(name))
}

function declaration(body: string, property: string): string | null {
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'i').exec(body)
  return match?.[1]?.trim() ?? null
}

function resolvePaint(value: string | null, css: string): string | null {
  if (!value) return null
  const first = value.split(/\s+/)[0] ?? value
  if (first === 'none' || first === 'transparent') return 'transparent'
  if (first.startsWith('var(')) return resolveVar(first, css)
  if (isWhite(first)) return '#ffffff'
  if (/^#[0-9a-fA-F]{6}$/.test(first)) return first.toLowerCase()
  return null
}

function resolveVar(value: string, css: string): string | null {
  const name = /var\(\s*(--[a-zA-Z0-9_-]+)/.exec(value)?.[1]
  if (!name) return null
  const root = /:root\s*\{([^{}]+)\}/.exec(css)?.[1] ?? ''
  const raw = new RegExp(`${name}\\s*:\\s*([^;]+)`).exec(root)?.[1]?.trim()
  if (!raw) return null
  return resolvePaint(raw, css)
}

function isWhite(value: string): boolean {
  const color = value.toLowerCase()
  return color === 'white' || color === '#fff' || color === '#ffffff'
}

function isLight(hex: string): boolean {
  if (hex === 'transparent') return false
  return luminance(hex) > LIGHT_LUMINANCE
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => channel(hex.slice(start, start + 2)))
  const red = channels[0] ?? 0
  const green = channels[1] ?? 0
  const blue = channels[2] ?? 0
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function channel(pair: string): number {
  const value = Number.parseInt(pair, 16) / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}
