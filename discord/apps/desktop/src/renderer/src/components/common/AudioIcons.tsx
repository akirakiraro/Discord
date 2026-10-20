interface AudioIconProps {
  off: boolean
  size?: number
}

/** Microfone no estilo do Discord, com risco quando está mutado. */
export function MicIcon({ off, size = 20 }: AudioIconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6.5 11a5.5 5.5 0 0 0 11 0M12 16.5V20M8.5 20h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {off && <path d="M5 19 19 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  )
}

/** Fone no estilo do Discord, com risco quando o áudio está silenciado. */
export function HeadsetIcon({ off, size = 20 }: AudioIconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 13V12a7.5 7.5 0 0 1 15 0v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="3" y="13" width="4" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.8" />
      <rect x="17" y="13" width="4" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.8" />
      {off && <path d="M5 19 19 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  )
}
