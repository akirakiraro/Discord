/** Alvos que não podem ganhar o realce azul de seleção. O texto da mensagem fica de fora. */
export const ICON_SELECT_LOCKS = [
  '.app-icon',
  '.icon-button',
  '.round-button',
  '.composer__attach',
  '.tile-collapse',
  '.message__action',
  '.channel-category__add',
  '.settings-modal__close',
  '.channel-item__icon',
  '.panel-header__icon',
  '.participant-row__muted',
  '.avatar',
  '.avatar__image',
  '.window-caption img',
  '.share-source img',
  'svg',
] as const

const STILL_SELECTABLE = ['.message__content', 'textarea', '.message__print img'] as const

/**
 * O que ainda aceita seleção ou arraste entre os ícones.
 * Exemplo: `missingIconSelectLocks(readFileSync('base.css', 'utf8'))`.
 */
export function missingIconSelectLocks(css: string): string[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  return [
    ...missingDeclaration(clean, ICON_SELECT_LOCKS, 'user-select', 'none'),
    ...missingDeclaration(clean, ICON_SELECT_LOCKS, '-webkit-user-drag', 'none'),
    ...missingDeclaration(clean, ['svg'], 'pointer-events', 'none'),
    ...unexpectedLock(clean),
  ]
}

function missingDeclaration(css: string, selectors: readonly string[], property: string, value: string): string[] {
  const found = selectorsDeclaring(css, property, value)
  return selectors.filter((selector) => !found.has(selector)).map((selector) => `${selector} sem ${property}: ${value}`)
}

function unexpectedLock(css: string): string[] {
  const locked = selectorsDeclaring(css, 'user-select', 'none')
  return STILL_SELECTABLE.filter((selector) => locked.has(selector)).map((selector) => `${selector} não devia ter user-select: none`)
}

function selectorsDeclaring(css: string, property: string, value: string): Set<string> {
  const found = new Set<string>()
  const pattern = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*${value}\\b`, 'i')
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!pattern.test(match[2] ?? '')) continue
    for (const part of (match[1] ?? '').split(',')) addSelector(found, part)
  }
  return found
}

function addSelector(found: Set<string>, part: string): void {
  const token = part.trim().split('::')[0]?.trim() ?? ''
  if (token.length > 0) found.add(token)
}
