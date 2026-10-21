import { describe, expect, it } from 'vitest'
import { visibleScreenShares } from './visibleScreenShares'

const local = { participant: { isLocal: true }, id: 'mine' }
const remote = { participant: { isLocal: false }, id: 'theirs' }

describe('visibleScreenShares', () => {
  it('mostra a própria transmissão junto com as remotas', () => {
    expect(visibleScreenShares([local, remote], true)).toEqual([local, remote])
  })

  it('esconde a própria transmissão quando o toggle está desligado', () => {
    expect(visibleScreenShares([local, remote], false)).toEqual([remote])
  })
})
