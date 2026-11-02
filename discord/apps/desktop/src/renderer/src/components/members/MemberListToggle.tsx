import { useEffect, useState } from 'react'
import { useMembersPanelStore } from '../../stores/membersPanelStore'

const AWAKE_MS = 900

export function MemberListToggle({ floating = false }: { floating?: boolean }): React.JSX.Element {
  const open = useMembersPanelStore((store) => store.open)
  const toggle = useMembersPanelStore((store) => store.toggle)
  const awake = useFloatAwake(floating)
  const label = open ? 'Ocultar pessoas' : 'Mostrar pessoas'
  const className = toggleClass(floating, open, awake)

  return (
    <button
      type="button"
      className={`icon-button ${className}`}
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

function useFloatAwake(enabled: boolean): boolean {
  const [awake, setAwake] = useState(false)

  useEffect(() => {
    if (!enabled) return undefined
    return watchPointer(setAwake)
  }, [enabled])

  return awake
}

function watchPointer(setAwake: (value: boolean) => void): () => void {
  let timer = 0
  const hide = (): void => setAwake(false)
  const onMove = (): void => {
    setAwake(true)
    window.clearTimeout(timer)
    timer = window.setTimeout(hide, AWAKE_MS)
  }
  window.addEventListener('mousemove', onMove)
  document.documentElement.addEventListener('mouseleave', hide)
  return () => {
    window.removeEventListener('mousemove', onMove)
    document.documentElement.removeEventListener('mouseleave', hide)
    window.clearTimeout(timer)
  }
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
