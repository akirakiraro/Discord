import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { LISTENER_UNITY, canAdjustListener, gainFromPercent, listenerGain, percentFromGain } from '../../lib/voice/listenerVolume'
import { useSessionStore } from '../../stores/sessionStore'
import { useListenerVolumeStore } from '../../stores/listenerVolumeStore'

interface ToggleProps {
  userId: string
  name: string
  children: ReactNode
}

/**
 * Clique na pessoa da call abre o volume só deste aparelho.
 * Exemplo: `<ListenerVolumeToggle userId={id} name={nome}>{linha}</ListenerVolumeToggle>`
 */
export function ListenerVolumeToggle({ userId, name, children }: ToggleProps): React.JSX.Element {
  const localUserId = useSessionStore((store) => store.session?.user.id ?? '')
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLButtonElement>(null)
  if (!canAdjustListener(localUserId, userId)) {
    return <div className="participant-row__main participant-row__main--static">{children}</div>
  }
  return (
    <>
      <button
        ref={anchor}
        type="button"
        className="participant-row__main"
        aria-expanded={open}
        aria-label={`Volume de ${name}`}
        onClick={() => setOpen((current) => !current)}
      >
        {children}
      </button>
      {open && (
        <ListenerVolumePopover
          anchor={anchor}
          localUserId={localUserId}
          userId={userId}
          name={name}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

interface PopoverProps {
  anchor: RefObject<HTMLButtonElement | null>
  localUserId: string
  userId: string
  name: string
  onClose: () => void
}

export function ListenerVolumePopover({ anchor, localUserId, userId, name, onClose }: PopoverProps): React.JSX.Element {
  const panel = useRef<HTMLDivElement>(null)
  const gain = useListenerVolumeStore((store) => listenerGain(store.file, localUserId, userId))
  const setGain = useListenerVolumeStore((store) => store.setGain)
  const percent = percentFromGain(gain)
  useDismiss(anchor, panel, onClose)
  return (
    <ListenerVolumePanel
      panel={panel}
      name={name}
      percent={percent}
      style={panelStyle(anchor.current)}
      onPercent={(next) => setGain(localUserId, userId, gainFromPercent(next))}
      onReset={() => setGain(localUserId, userId, LISTENER_UNITY)}
    />
  )
}

interface PanelProps {
  panel: RefObject<HTMLDivElement | null>
  name: string
  percent: number
  style: CSSProperties
  onPercent: (percent: number) => void
  onReset: () => void
}

/** Painel do slider. O teste renderiza isto sem a sala. */
export function ListenerVolumePanel({ panel, name, percent, style, onPercent, onReset }: PanelProps): React.JSX.Element {
  return (
    <div ref={panel} className="listener-volume__panel" role="dialog" aria-label={`Volume de ${name}`} style={style}>
      <p>Volume de {name}</p>
      <VolumeSlider name={name} percent={percent} onPercent={onPercent} />
      <button type="button" className="listener-volume__reset" onClick={onReset}>
        Volume normal
      </button>
      <p className="listener-volume__hint">100% não altera o áudio. Só você ouve neste volume.</p>
    </div>
  )
}

function VolumeSlider({ name, percent, onPercent }: { name: string; percent: number; onPercent: (percent: number) => void }): React.JSX.Element {
  return (
    <div className="listener-volume__row">
      <input
        type="range"
        min={0}
        max={200}
        value={percent}
        aria-label={`Volume de ${name}`}
        aria-valuetext={`${percent}%`}
        style={{ '--slider-fill': `${percent / 2}%` } as React.CSSProperties}
        onChange={(event) => onPercent(Number(event.target.value))}
      />
      <span className="listener-volume__percent">{percent}%</span>
    </div>
  )
}

function useDismiss(anchor: RefObject<HTMLElement | null>, panel: RefObject<HTMLElement | null>, onClose: () => void): void {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => bindDismiss(anchor, panel, () => closeRef.current()), [anchor, panel])
}

function bindDismiss(
  anchor: RefObject<HTMLElement | null>,
  panel: RefObject<HTMLElement | null>,
  onClose: () => void,
): () => void {
  const onPointer = (event: PointerEvent) => {
    if (inside(anchor.current, event.target) || inside(panel.current, event.target)) return
    onClose()
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose()
  }
  document.addEventListener('pointerdown', onPointer)
  document.addEventListener('keydown', onKey)
  const scroller = anchor.current?.closest('.channel-sidebar__channels')
  scroller?.addEventListener('scroll', onClose, { once: true })
  return () => {
    document.removeEventListener('pointerdown', onPointer)
    document.removeEventListener('keydown', onKey)
    scroller?.removeEventListener('scroll', onClose)
  }
}

function inside(root: HTMLElement | null, target: EventTarget | null): boolean {
  return target instanceof Node && root !== null && root.contains(target)
}

function panelStyle(anchor: HTMLElement | null): CSSProperties {
  const width = 220
  if (!anchor) return { position: 'fixed', top: 8, left: 8, width }
  const rect = anchor.getBoundingClientRect()
  const left = Math.min(rect.left, window.innerWidth - width - 8)
  const top = Math.min(rect.bottom + 4, window.innerHeight - 148)
  return { position: 'fixed', top, left, width }
}
