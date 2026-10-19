import { describe, expect, it } from 'vitest'
import { readBearerToken } from './currentUser'

describe('readBearerToken', () => {
  it.each([
    ['Bearer abc', 'abc'],
    ['Bearer   abc  ', 'abc'],
    ['Bearer ', undefined],
    ['Basic abc', undefined],
    [undefined, undefined],
  ])('"%s" → %s', (header, expected) => {
    expect(readBearerToken(header)).toBe(expected)
  })
})
