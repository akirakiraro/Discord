import { describe, expect, it } from 'vitest'
import { TYPING_TTL_MS, activeTypistIds, describeTypists, withTypingStarted, withTypingStopped } from './typingState'

describe('typingState', () => {
  it('mostra quem está digitando até o TTL vencer', () => {
    const state = withTypingStarted({}, { channelId: 'c', userId: 'u-1' }, 1000)

    expect(activeTypistIds(state, 'c', 1000 + TYPING_TTL_MS - 1)).toEqual(['u-1'])
    expect(activeTypistIds(state, 'c', 1000 + TYPING_TTL_MS)).toEqual([])
    expect(activeTypistIds(state, 'outro', 1000)).toEqual([])
  })

  it('withTypingStopped tira o usuário na hora', () => {
    const state = withTypingStarted({}, { channelId: 'c', userId: 'u-1' }, 1000)

    expect(activeTypistIds(withTypingStopped(state, { channelId: 'c', userId: 'u-1' }), 'c', 1000)).toEqual([])
    expect(withTypingStopped(state, { channelId: 'c', userId: 'ninguem' }), 'nada muda').toBe(state)
  })
})

describe('describeTypists', () => {
  it.each([
    [[], ''],
    [['Bia'], 'Bia está digitando…'],
    [['Bia', 'Caio'], 'Bia e Caio estão digitando…'],
    [['Bia', 'Caio', 'Duda'], 'Bia, Caio e Duda estão digitando…'],
    [['Bia', 'Caio', 'Duda', 'Edu'], 'Várias pessoas estão digitando…'],
  ])('%j → "%s"', (names, expected) => {
    expect(describeTypists(names)).toBe(expected)
  })
})
