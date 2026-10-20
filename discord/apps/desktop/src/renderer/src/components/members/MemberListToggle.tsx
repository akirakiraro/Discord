import { useMembersPanelStore } from '../../stores/membersPanelStore'

export function MemberListToggle(): React.JSX.Element {
  const open = useMembersPanelStore((store) => store.open)
  const toggle = useMembersPanelStore((store) => store.toggle)
  const label = open ? 'Ocultar pessoas' : 'Mostrar pessoas'

  return (
    <button
      type="button"
      className={open ? 'icon-button member-toggle member-toggle--open' : 'icon-button member-toggle'}
      title={label}
      aria-label={label}
      aria-pressed={open}
      onClick={toggle}
    >
      <PeopleIcon />
    </button>
  )
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
