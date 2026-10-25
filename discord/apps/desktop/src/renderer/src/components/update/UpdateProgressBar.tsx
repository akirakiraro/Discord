interface UpdateProgressBarProps {
  percent: number | null
}

/** Barra determinada, ou indeterminada quando `percent` é null. */
export function UpdateProgressBar({ percent }: UpdateProgressBarProps): React.JSX.Element {
  if (percent === null) return <IndeterminateBar />
  return <DeterminateBar percent={percent} />
}

function DeterminateBar({ percent }: { percent: number }): React.JSX.Element {
  const shown = Math.round(percent)
  return (
    <div className="update-corner__bar" role="progressbar" aria-valuenow={shown} aria-valuemin={0} aria-valuemax={100}>
      <div className="update-corner__fill" style={{ width: `${shown}%` }} />
    </div>
  )
}

function IndeterminateBar(): React.JSX.Element {
  return (
    <div className="update-corner__bar" role="progressbar" aria-label="Instalando">
      <div className="update-corner__fill update-corner__fill--indeterminate" />
    </div>
  )
}
