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

/** Engrenagem preenchida, no estilo do botão de configurações do Discord. */
export function GearIcon({ size = 20 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"
      />
    </svg>
  )
}

/**
 * Alto-falante do volume da tela. Sem ondas quando o volume está em zero.
 * Exemplo: `<VolumeIcon muted={volume === 0} />`.
 */
export function VolumeIcon({ muted, size = 18 }: { muted: boolean; size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M3.5 9.5h3.4L11 5.6v12.8l-4.1-3.9H3.5z" />
      {muted ? mutedMark() : volumeWaves()}
    </svg>
  )
}

function volumeWaves(): React.JSX.Element {
  return (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      d="M15 9.1a4.2 4.2 0 0 1 0 5.8M17.5 6.6a7.4 7.4 0 0 1 0 10.8"
    />
  )
}

function mutedMark(): React.JSX.Element {
  return <path fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" d="m16 10 4 4m0-4-4 4" />
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
