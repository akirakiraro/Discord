import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_SHARE_FRAME_RATE,
  DEFAULT_SHARE_QUALITY,
  SHARE_FRAME_RATES,
  SHARE_QUALITIES,
  type ShareFrameRate,
  type ShareQuality,
} from '../../lib/voice/screenSharePresets'
import { Button } from '../ui/Button'

const QUALITY_LABEL: Record<ShareQuality, string> = {
  '720p': '720p',
  '1080p': '1080p',
  native: 'Nativa',
}

export interface ShareSelection {
  sourceId: string
  quality: ShareQuality
  frameRate: ShareFrameRate
}

interface ScreenSharePickerProps {
  onCancel: () => void
  onConfirm: (selection: ShareSelection) => void
}

export function ScreenSharePicker({ onCancel, onConfirm }: ScreenSharePickerProps): React.JSX.Element {
  const catalog = useSourceCatalog()
  const [sourceId, setSourceId] = useState('')
  const [quality, setQuality] = useState<ShareQuality>(DEFAULT_SHARE_QUALITY)
  const [frameRate, setFrameRate] = useState<ShareFrameRate>(DEFAULT_SHARE_FRAME_RATE)

  useDismissOnEscape(onCancel)
  useEffect(() => {
    if (sourceId) return
    const first = catalog.screens[0] ?? catalog.windows[0]
    if (first) setSourceId(first.id)
  }, [catalog.screens, catalog.windows, sourceId])

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <form
        className="share-picker"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => submitShare(event, { sourceId, quality, frameRate }, onConfirm)}
      >
        <h2>Compartilhar tela</h2>
        {catalog.error && <p className="share-picker__error">{catalog.error}</p>}
        <SourceGroup title="Tela cheia" sources={catalog.screens} sourceId={sourceId} onSelect={setSourceId} />
        <SourceGroup title="Janela" sources={catalog.windows} sourceId={sourceId} onSelect={setSourceId} />
        <div className="share-picker__options">
          <QualitySelect quality={quality} onChange={setQuality} />
          <FrameRateSelect frameRate={frameRate} onChange={setFrameRate} />
        </div>
        <div className="share-picker__actions">
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={!sourceId}>Compartilhar</Button>
        </div>
      </form>
    </div>
  )
}

function useSourceCatalog(): { screens: ScreenSourceOption[]; windows: ScreenSourceOption[]; error: string } {
  const [sources, setSources] = useState<ScreenSourceOption[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const bridge = window.radcord
    if (!bridge) {
      setError('Captura de tela indisponível neste processo.')
      return
    }
    void bridge.listScreenSources().then(setSources).catch((reason: unknown) => {
      setError(`Falha ao listar telas: ${String(reason)}`)
    })
  }, [])

  const screens = useMemo(() => sources.filter((source) => source.kind === 'screen'), [sources])
  const windows = useMemo(() => sources.filter((source) => source.kind === 'window'), [sources])
  return { screens, windows, error }
}

function useDismissOnEscape(onCancel: () => void): void {
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])
}

function SourceGroup({ title, sources, sourceId, onSelect }: {
  title: string
  sources: ScreenSourceOption[]
  sourceId: string
  onSelect: (id: string) => void
}): React.JSX.Element {
  return (
    <section className="share-picker__group">
      <h3>{title}</h3>
      <div className="share-picker__grid">
        {sources.map((source) => (
          <SourceCard key={source.id} source={source} selected={source.id === sourceId} onSelect={onSelect} />
        ))}
      </div>
    </section>
  )
}

function SourceCard({ source, selected, onSelect }: {
  source: ScreenSourceOption
  selected: boolean
  onSelect: (id: string) => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={selected ? 'share-source share-source--selected' : 'share-source'}
      onClick={() => onSelect(source.id)}
    >
      <img src={source.thumbnailUrl} alt="" />
      <span>{source.name}</span>
    </button>
  )
}

function QualitySelect({ quality, onChange }: {
  quality: ShareQuality
  onChange: (quality: ShareQuality) => void
}): React.JSX.Element {
  return (
    <label>
      Qualidade
      <select value={quality} onChange={(event) => onChange(asQuality(event.target.value))}>
        {SHARE_QUALITIES.map((item) => (
          <option key={item} value={item}>{QUALITY_LABEL[item]}</option>
        ))}
      </select>
    </label>
  )
}

function FrameRateSelect({ frameRate, onChange }: {
  frameRate: ShareFrameRate
  onChange: (frameRate: ShareFrameRate) => void
}): React.JSX.Element {
  return (
    <label>
      Quadros por segundo
      <select value={frameRate} onChange={(event) => onChange(asFrameRate(event.target.value))}>
        {SHARE_FRAME_RATES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </label>
  )
}

function submitShare(
  event: React.FormEvent<HTMLFormElement>,
  selection: ShareSelection,
  onConfirm: (selection: ShareSelection) => void,
): void {
  event.preventDefault()
  if (!selection.sourceId) return
  onConfirm(selection)
}

function asQuality(value: string): ShareQuality {
  if (value === '720p' || value === '1080p' || value === 'native') return value
  throw new Error(`qualidade inválida: ${value}; esperado 720p, 1080p ou native`)
}

function asFrameRate(value: string): ShareFrameRate {
  if (value === '15' || value === '30' || value === '60') return Number(value) as ShareFrameRate
  throw new Error(`framerate inválido: ${value}; esperado 15, 30 ou 60`)
}
