const AVATAR_PALETTE = ['#5865F2', '#3BA55C', '#FAA61A', '#ED4245', '#EB459E', '#00A8FC'] as const

/**
 * Cor fixa por pessoa, para cada amigo ter sempre o mesmo avatar.
 * Exemplo: `<div style={{ background: pickAvatarColor(participant.identity) }} />`
 */
export function pickAvatarColor(seed: string): string {
  let hash = 0
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length] ?? AVATAR_PALETTE[0]
}
