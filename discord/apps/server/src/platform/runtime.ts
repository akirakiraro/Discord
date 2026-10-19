import { randomUUID } from 'node:crypto'

export type Clock = () => Date
export type IdGenerator = () => string

export const systemClock: Clock = () => new Date()
export const randomIdGenerator: IdGenerator = () => randomUUID()
