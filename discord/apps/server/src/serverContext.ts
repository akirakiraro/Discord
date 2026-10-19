import type { DatabaseSync } from 'node:sqlite'
import type { PasswordHasher } from './auth/passwordHasher'
import { AuthService } from './auth/authService'
import { SqliteSessionRepository } from './auth/sessionRepository'
import { SqliteChannelRepository } from './channels/channelRepository'
import { ChannelService } from './channels/channelService'
import { SqliteMessageRepository } from './messages/messageRepository'
import { MessageService } from './messages/messageService'
import type { Clock, IdGenerator } from './platform/runtime'
import { PresenceTracker } from './realtime/presenceTracker'
import { SocketIoBroadcaster } from './realtime/realtimeBroadcaster'
import { SqliteUserRepository, type UserRepository } from './users/userRepository'
import type { VoiceTokenIssuer } from './voice/voiceTokenIssuer'

export interface ServerContextInputs {
  db: DatabaseSync
  hasher: PasswordHasher
  tokenIssuer: VoiceTokenIssuer
  livekitPublicUrl: string
  clock: Clock
  newId: IdGenerator
}

export interface ServerContext {
  auth: AuthService
  channels: ChannelService
  messages: MessageService
  users: UserRepository
  presence: PresenceTracker
  broadcaster: SocketIoBroadcaster
  tokenIssuer: VoiceTokenIssuer
  livekitPublicUrl: string
}

/**
 * Raiz de composição: liga repositórios SQLite, serviços e o broadcaster.
 * Exemplo: `const context = createServerContext({ db, hasher, tokenIssuer, livekitPublicUrl, clock, newId })`
 */
export function createServerContext(inputs: ServerContextInputs): ServerContext {
  const { db, clock, newId } = inputs
  const broadcaster = new SocketIoBroadcaster()
  const users = new SqliteUserRepository(db)
  const sessions = new SqliteSessionRepository(db)
  const auth = new AuthService({ users, sessions, hasher: inputs.hasher, broadcaster, clock, newId })
  const channels = new ChannelService({ channels: new SqliteChannelRepository(db), broadcaster, clock, newId })
  const messages = new MessageService({ messages: new SqliteMessageRepository(db), channels, broadcaster, clock, newId })
  channels.ensureDefaultChannels()
  return {
    auth,
    channels,
    messages,
    users,
    presence: new PresenceTracker(),
    broadcaster,
    tokenIssuer: inputs.tokenIssuer,
    livekitPublicUrl: inputs.livekitPublicUrl,
  }
}
