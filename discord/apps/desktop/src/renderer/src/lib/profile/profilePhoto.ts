const MAX_EDGE = 128
const MAX_BYTES = 1_500_000

export interface PixelSize {
  width: number
  height: number
}

/**
 * Recusa arquivo grande demais antes de desenhar no canvas.
 * Exemplo: `rejectOversizedPhoto(file.size)`
 */
export function rejectOversizedPhoto(size: number): string | null {
  if (size <= MAX_BYTES) return null
  return `A foto tem ${size} bytes; o máximo é ${MAX_BYTES}.`
}

/**
 * Encaixa a foto num quadrado de até 128 px, sem esticar.
 * Exemplo: `profilePhotoSize(800, 400)` → `{ width: 128, height: 64 }`
 */
export function profilePhotoSize(width: number, height: number): PixelSize {
  const longest = Math.max(width, height, 1)
  const scale = Math.min(1, MAX_EDGE / longest)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Lê um arquivo de imagem e devolve um JPEG pequeno em data URL.
 * Exemplo: `const avatarUrl = await readChosenPhoto(file)`
 */
export async function readChosenPhoto(file: File): Promise<string> {
  const sizeError = rejectOversizedPhoto(file.size)
  if (sizeError) throw new Error(sizeError)
  if (!file.type.startsWith('image/')) {
    throw new Error(`Arquivo "${file.name}" (${file.type || 'sem tipo'}) não é imagem; esperado jpeg, png ou webp.`)
  }
  const bitmap = await createImageBitmap(file)
  try {
    return drawProfilePhoto(bitmap, document.createElement('canvas'))
  } finally {
    bitmap.close()
  }
}

function drawProfilePhoto(bitmap: ImageBitmap, canvas: HTMLCanvasElement): string {
  const size = profilePhotoSize(bitmap.width, bitmap.height)
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('O navegador não abriu um canvas 2d para a foto de perfil.')
  context.drawImage(bitmap, 0, 0, size.width, size.height)
  return canvas.toDataURL('image/jpeg', 0.82)
}
