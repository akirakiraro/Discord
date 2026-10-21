interface LocalFlag {
  participant: { isLocal: boolean }
}

/**
 * Decide quais transmissões aparecem. A própria fica visível, salvo se o toggle desligar.
 * Exemplo: `visibleScreenShares(tracks, false)`
 */
export function visibleScreenShares<T extends LocalFlag>(tracks: readonly T[], showOwnShare: boolean): T[] {
  if (showOwnShare) return [...tracks]
  return tracks.filter((track) => !track.participant.isLocal)
}
