import { describe, expect, it } from 'vitest'
import { classifyPing } from './pingQuality'

describe('classifyPing', () => {
  it.each([
    [null, 'offline'],
    [0, 'good'],
    [60, 'good'],
    [61, 'fair'],
    [120, 'fair'],
    [121, 'poor'],
  ] as const)('ping %s → %s', (pingMs, expected) => {
    expect(classifyPing(pingMs)).toBe(expected)
  })
})
