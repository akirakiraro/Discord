import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { HttpError, describeInput, parseRequest } from './httpError'

const nameSchema = z.object({ name: z.string().min(2) })

describe('parseRequest', () => {
  it('devolve os dados validados', () => {
    expect(parseRequest(nameSchema, { name: 'ok' })).toEqual({ name: 'ok' })
  })

  it('lança HttpError 400 citando o valor recebido e o campo', () => {
    const attempt = (): unknown => parseRequest(nameSchema, { name: 'x' })

    expect(attempt).toThrow(HttpError)
    expect(attempt).toThrow(/\{"name":"x"\}.*name:/)
  })

  it('identifica o corpo inteiro quando ele não é objeto', () => {
    expect(() => parseRequest(nameSchema, null)).toThrow(/corpo:/)
  })

  it('mascara a senha na mensagem de erro', () => {
    const attempt = (): unknown => parseRequest(nameSchema, { name: 'x', password: 'segredo123' })

    expect(attempt).toThrow(/"password":"\*\*\*"/)
    expect(attempt).not.toThrow(/segredo123/)
  })
})

describe('describeInput', () => {
  it('serializa undefined sem quebrar', () => {
    expect(describeInput(undefined)).toBe('undefined')
  })
})
