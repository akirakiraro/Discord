import { useEffect, useState } from 'react'
import { SKIPPED_UPDATE, parseUpdateSnapshot, type UpdateSnapshot } from '../../../shared/desktopUpdateSnapshot'

export interface DesktopUpdateController {
  snapshot: UpdateSnapshot
  retry: () => void
  install: () => void
}

/**
 * Espelha a máquina de estados do processo principal. A checagem em si começa lá, na abertura.
 * Exemplo: `const update = useDesktopUpdate()`
 */
export function useDesktopUpdate(): DesktopUpdateController {
  const [snapshot, setSnapshot] = useState<UpdateSnapshot>(readInitialSnapshot)

  useEffect(() => window.radcord?.onUpdateState((next) => setSnapshot(parseUpdateSnapshot(next))), [])

  return {
    snapshot,
    retry: () => applySnapshot(window.radcord?.checkForUpdate, setSnapshot),
    install: () => {
      void window.radcord?.installUpdate()
    },
  }
}

function readInitialSnapshot(): UpdateSnapshot {
  const read = window.radcord?.readUpdateState
  if (!read) return SKIPPED_UPDATE
  return parseUpdateSnapshot(read())
}

function applySnapshot(read: (() => Promise<UpdateSnapshot>) | undefined, setSnapshot: (snapshot: UpdateSnapshot) => void): void {
  if (!read) return
  void read()
    .then((snapshot) => setSnapshot(parseUpdateSnapshot(snapshot)))
    .catch(() => undefined)
}
