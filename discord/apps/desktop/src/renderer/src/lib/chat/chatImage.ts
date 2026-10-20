import { MESSAGE_IMAGE_MAX_LENGTH } from '@radcord/shared'
import type { PixelSize } from '../profile/profilePhoto'

const MAX_EDGE = 1280
const MAX_SOURCE_BYTES = 12_000_000

/**
 * Recusa o arquivo antes de desenhar no canvas.
 * Exemplo: `rejectOversizedChatFile(file.size)`
 */
export function rejectOversizedChatFile(size: number): string | null {
  if (size <= MAX_SOURCE_BYTES) return null
  return `O print tem ${size} bytes; o máximo é ${MAX_SOURCE_BYTES}.`
}

/**
 * Encaixa o print em até 1280 px no lado maior.
 * Exemplo: `chatImageSize(2560, 1440)` → `{ width: 1280, height: 720 }`
 */
export function chatImageSize(width: number, height: number): PixelSize {
  const longest = Math.max(width, height, 1)
  const scale = Math.min(1, MAX_EDGE / longest)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Lê um print (arquivo ou área de transferência) e devolve JPEG em data URL.
 * Exemplo: `const imageUrl = await readChatImage(file)`
 */
export async function readChatImage(file: File): Promise<string> {
  const sizeError = rejectOversizedChatFile(file.size)
  if (sizeError) throw new Error(sizeError)
  if (!file.type.startsWith('image/')) {
    throw new Error(`Arquivo "${file.name}" (${file.type || 'sem tipo'}) não é imagem; esperado jpeg, png ou webp.`)
  }
  const bitmap = await createImageBitmap(file)
  try {
    return encodeChatJpeg(bitmap, document.createElement('canvas'))
  } finally {
    bitmap.close()
  }
}

function encodeChatJpeg(bitmap: ImageBitmap, canvas: HTMLCanvasElement): string {
  const size = chatImageSize(bitmap.width, bitmap.height)
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('O navegador não abriu um canvas 2d para o print.')
  context.drawImage(bitmap, 0, 0, size.width, size.height)
  return shrinkUntilFit(canvas)
}

function shrinkUntilFit(canvas: HTMLCanvasElement): string {
  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    if (dataUrl.length <= MESSAGE_IMAGE_MAX_LENGTH) return dataUrl
  }
  throw new Error(`O print ficou maior que ${MESSAGE_IMAGE_MAX_LENGTH} caracteres depois de compactar.`)
}
