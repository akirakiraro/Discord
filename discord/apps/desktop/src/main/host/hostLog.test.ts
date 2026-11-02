import { describe, expect, it } from 'vitest'
import { appendCappedLog, logTail, rotatedLogPath, shouldRotateLog, type LogFiles } from './hostLog'

describe('log do host', () => {
  it('a partir de 1 MB troca o arquivo por .1 e as últimas linhas são 40', () => {
    expect(shouldRotateLog(999_999)).toBe(false)
    expect(shouldRotateLog(1_000_000)).toBe(true)
    expect(rotatedLogPath('/repo/logs/api.log')).toBe('/repo/logs/api.log.1')

    const renamed: string[] = []
    const appended: string[] = []
    const files: LogFiles = {
      size: () => 1_000_000,
      rename: (from, to) => renamed.push(`${from} -> ${to}`),
      append: (_path, text) => appended.push(text),
    }
    appendCappedLog(files, '/repo/logs/api.log', 'nova\n')

    expect(renamed).toEqual(['/repo/logs/api.log -> /repo/logs/api.log.1'])
    expect(appended).toEqual(['nova\n'])

    const text = Array.from({ length: 41 }, (_, index) => `linha-${index}`).join('\n')
    const tail = logTail(text)
    expect(tail).toHaveLength(40)
    expect(tail[0]).toBe('linha-1')
    expect(tail[39]).toBe('linha-40')
  })
})
