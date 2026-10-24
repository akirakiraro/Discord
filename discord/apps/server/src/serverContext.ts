import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { AuthService } from './auth/authService'
import { SqliteSessionRepository } from './auth/sessionRepository'
import { SqliteChannelRepository } from './channels/channelRepository'
import { ChannelService } from './channels/channelService'
import { SqliteMessageRepository } from './messages/messageRepository'
import { MessageService } from './messages/messageService'
import type { Clock, IdGenerator } from './platform/runtime'
import { PresenceTracker } from './realtime/presenceTracker'
import { SocketIoBroadcaster } from './realtime/realtimeBroadcaster'
import { VoiceRoster } from './realtime/voiceRoster'
import { SqliteUserRepository, type UserRepository } from './users/userRepository'
import type { VoiceTokenIssuer } from './voice/voiceTokenIssuer'

export interface ServerContextInputs {
  db: DatabaseSync
  tokenIssuer: VoiceTokenIssuer
  livekitPublicUrl: string
  clock: Clock
  newId: IdGenerator
  clientReportsPath?: string
}

export interface ServerContext {
  auth: AuthService
  channels: ChannelService
  messages: MessageService
  users: UserRepository
  presence: PresenceTracker
  voiceRoster: VoiceRoster
  broadcaster: SocketIoBroadcaster
  tokenIssuer: VoiceTokenIssuer
  livekitPublicUrl: string
  clock: Clock
  clientReportsPath: string
}

/**
 * Raiz de composição: liga repositórios SQLite, serviços e o broadcaster.
 * Exemplo: `const context = createServerContext({ db, tokenIssuer, livekitPublicUrl, clock, newId })`
 */
export function createServerContext(inputs: ServerContextInputs): ServerContext {
  const { db, clock, newId } = inputs
  const broadcaster = new SocketIoBroadcaster()
  const users = new SqliteUserRepository(db)
  const sessions = new SqliteSessionRepository(db)
  const auth = new AuthService({ users, sessions, broadcaster, clock, newId })
  const channels = new ChannelService({ channels: new SqliteChannelRepository(db), broadcaster, clock, newId })
  const messages = new MessageService({ messages: new SqliteMessageRepository(db), channels, broadcaster, clock, newId })
  channels.ensureDefaultChannels()
  return {
    auth,
    channels,
    messages,
    users,
    presence: new PresenceTracker(),
    voiceRoster: new VoiceRoster(),
    broadcaster,
    tokenIssuer: inputs.tokenIssuer,
    livekitPublicUrl: inputs.livekitPublicUrl,
    clock: inputs.clock,
    clientReportsPath: inputs.clientReportsPath ?? join(tmpdir(), 'radcord-client-reports.log'),
  }
}
