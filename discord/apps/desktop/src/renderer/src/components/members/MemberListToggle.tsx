import { useEffect, useRef, useState } from 'react'
import { useMembersPanelStore } from '../../stores/membersPanelStore'

const AWAKE_MS = 900
const NEAR_PX = 72

export function MemberListToggle({ floating = false }: { floating?: boolean }): React.JSX.Element {
  const open = useMembersPanelStore((store) => store.open)
  const toggle = useMembersPanelStore((store) => store.toggle)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const awake = useFloatAwake(floating, buttonRef)
  const label = open ? 'Ocultar pessoas' : 'Mostrar pessoas'
  const className = toggleClass(floating, open, awake)

  return (
    <button
      ref={buttonRef}
      type="button"
      className={className}
      title={label}
      aria-label={label}
      aria-pressed={open}
      onClick={toggle}
    >
      <PeopleIcon />
    </button>
  )
}

function toggleClass(floating: boolean, open: boolean, awake: boolean): string {
  const base = floating ? 'icon-button member-toggle member-toggle--float' : 'icon-button member-toggle'
  const openClass = open ? ' member-toggle--open' : ''
  const awakeClass = floating && awake ? ' member-toggle--awake' : ''
  return `${base}${openClass}${awakeClass}`
}

function useFloatAwake(enabled: boolean, ref: React.RefObject<HTMLButtonElement | null>): boolean {
  const [awake, setAwake] = useState(false)

  useEffect(() => {
    if (!enabled) return undefined
    return watchPointer(ref, setAwake)
  }, [enabled, ref])

  return awake
}

function watchPointer(ref: React.RefObject<HTMLButtonElement | null>, setAwake: (value: boolean) => void): () => void {
  let timer = 0
  const onMove = (event: MouseEvent): void => {
    const box = ref.current?.getBoundingClientRect()
    const near = box ? nearBox(event.clientX, event.clientY, box, NEAR_PX) : false
    setAwake(near)
    window.clearTimeout(timer)
    if (near) timer = window.setTimeout(() => setAwake(false), AWAKE_MS)
  }
  window.addEventListener('mousemove', onMove)
  return () => {
    window.removeEventListener('mousemove', onMove)
    window.clearTimeout(timer)
  }
}

function nearBox(x: number, y: number, box: DOMRect, pad: number): boolean {
  const insideX = x >= box.left - pad && x <= box.right + pad
  const insideY = y >= box.top - pad && y <= box.bottom + pad
  return insideX && insideY
}

function PeopleIcon(): React.JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 14.2a4.5 4.5 0 0 1 4.5 4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
