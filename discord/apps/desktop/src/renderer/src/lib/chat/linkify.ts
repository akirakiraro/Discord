export interface ContentSegment {
  kind: 'text' | 'link'
  value: string
}

const URL_PATTERN = /https?:\/\/[^\s<]+[^\s<.,;:!?)"'\]]/g

/**
 * Quebra o texto em pedaços de texto puro e links http(s), sem interpretar HTML.
 * Exemplo: `splitLinks('veja https://x.com')` → `[{ kind: 'text', value: 'veja ' }, { kind: 'link', value: 'https://x.com' }]`
 */
export function splitLinks(content: string): ContentSegment[] {
  const segments: ContentSegment[] = []
  let cursor = 0
  for (const match of content.matchAll(URL_PATTERN)) {
    if (match.index > cursor) segments.push({ kind: 'text', value: content.slice(cursor, match.index) })
    segments.push({ kind: 'link', value: match[0] })
    cursor = match.index + match[0].length
  }
  if (cursor < content.length) segments.push({ kind: 'text', value: content.slice(cursor) })
  return segments
}
