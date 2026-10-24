export const EAR_WAIT_MS = 8_000

export interface CaptureProbe {
  echoCancellation?: boolean
  voiceIsolation?: boolean
}

export interface EarElementState {
  paused: boolean
  muted: boolean
  volume: number
  readyState: number
}

/** O que a escuta observou. Serve para a mensagem na tela e para o relato. */
export interface EarSilenceInput {
  remoteCount: number
  ownSource: string
  sawOwnMic: boolean
  subscribeError: string | null
  playbackError: string | null
  disconnectError: string | null
  element: EarElementState | null
  echoCancellation: boolean | undefined
  voiceIsolation: boolean | undefined
}

/**
 * Erro da escuta com um detalhe curto para o relato do cliente.
 * Exemplo: `new EarFailure('sem faixa', 'mic=0')`
 */
export class EarFailure extends Error {
  readonly detail: string

  constructor(message: string, detail: string) {
    super(message)
    this.name = 'EarFailure'
    this.detail = detail
  }
}

/** A escuta foi desligada no meio do caminho. Não é falha para mostrar. */
export class EarClosed extends Error {
  constructor() {
    super('escuta cancelada')
    this.name = 'EarClosed'
  }
}

/**
 * O Chromium apaga o retorno quando o módulo de eco continua ligado.
 * Exemplo: `explainCaptureBlock({ echoCancellation: true })`
 */
export function explainCaptureBlock(probe: CaptureProbe): string | null {
  if (probe.echoCancellation === true) return 'O Chromium manteve o cancelamento de eco ligado e apaga o retorno da sua voz.'
  if (probe.voiceIsolation === true) return 'O Chromium manteve o isolamento de voz ligado e trata o retorno como eco.'
  return null
}

/**
 * Mensagem quando a escuta conectou e mesmo assim não há som.
 * `null` quando o elemento está tocando de verdade.
 * Exemplo: `explainEarSilence({ ...vazio, sawOwnMic: false })`
 */
export function explainEarSilence(input: EarSilenceInput): string | null {
  const blocked = explainCaptureBlock(input)
  if (blocked) return blocked
  if (input.subscribeError) return `Não assinei o microfone: ${input.subscribeError}`
  if (input.disconnectError) return input.disconnectError
  if (input.playbackError) return `O navegador não tocou o retorno: ${input.playbackError}`
  if (!input.sawOwnMic) return missingMic(input)
  return describeEarElement(input.element)
}

/**
 * `null` quando o elemento está tocando com volume.
 * Exemplo: `describeEarElement({ paused: true, muted: false, volume: 1, readyState: 4 })`
 */
export function describeEarElement(element: EarElementState | null): string | null {
  if (!element) return 'A faixa chegou, mas não houve elemento de áudio para tocar.'
  if (element.muted || element.volume === 0) return 'O áudio da escuta foi criado mudo.'
  if (element.paused) return 'O áudio da escuta não começou a tocar.'
  return null
}

/**
 * Linha curta, sem token, para o relato que o host já grava.
 * Exemplo: `earDetail(input, 'ws://26.1.2.3:7880')`
 */
export function earDetail(input: EarSilenceInput, livekitUrl?: string): string {
  const parts = [
    `eco=${flag(input.echoCancellation)}`,
    `voz=${flag(input.voiceIsolation)}`,
    `mic=${input.sawOwnMic ? 1 : 0}`,
    `rem=${input.remoteCount}`,
    `fonte=${input.ownSource}`,
    `play=${input.playbackError ?? '-'}`,
    `sub=${input.subscribeError ?? '-'}`,
    `el=${elementCode(input.element)}`,
    livekitUrl ? `url=${livekitUrl}` : '',
  ]
  return parts.filter((part) => part !== '').join(' ')
}

/**
 * Exemplo: `earCaptureFailure({ echoCancellation: true })`
 */
export function earCaptureFailure(probe: CaptureProbe): EarFailure | null {
  const message = explainCaptureBlock(probe)
  if (!message) return null
  return new EarFailure(message, earDetail({ ...emptyEarInput(), ...probe }))
}

/** Exemplo: `emptyEarInput().sawOwnMic` é `false`. */
export function emptyEarInput(): EarSilenceInput {
  return {
    remoteCount: 0,
    ownSource: 'ausente',
    sawOwnMic: false,
    subscribeError: null,
    playbackError: null,
    disconnectError: null,
    element: null,
    echoCancellation: undefined,
    voiceIsolation: undefined,
  }
}

function missingMic(input: EarSilenceInput): string {
  if (input.remoteCount === 0) return 'A escuta entrou na sala, mas não viu ninguém. O microfone não chegou a ser assinado.'
  if (input.ownSource === 'ausente') return 'A escuta viu a sala, mas não encontrou esta conta entre quem publica.'
  if (input.ownSource === 'sem-microfone') return 'A escuta viu esta conta, mas o microfone não estava publicado.'
  return `A escuta viu o seu microfone como "${input.ownSource}" e não assinou.`
}

function elementCode(element: EarElementState | null): string {
  if (!element) return '-'
  return `p${element.paused ? 1 : 0}m${element.muted ? 1 : 0}v${element.volume}r${element.readyState}`
}

function flag(value: boolean | undefined): string {
  if (value === true) return '1'
  if (value === false) return '0'
  return '?'
}
