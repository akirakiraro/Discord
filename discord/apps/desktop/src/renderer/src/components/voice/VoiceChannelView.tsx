import type { ChannelDto } from '@radcord/shared'
import { voiceSession } from '../../lib/voice/voiceSession'
import { useSessionStore } from '../../stores/sessionStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { VoiceStage } from './VoiceStage'

function JoinPrompt({ channel }: { channel: ChannelDto }): React.JSX.Element {
  const api = useSessionStore((store) => store.session?.api)
  const lastError = useVoiceStore((store) => store.lastError)

  return (
    <div className="voice-join">
      <h2>🔊 {channel.name}</h2>
      <p>Ninguém te ouve até você entrar.</p>
      {lastError && <p className="voice-join__error">{lastError}</p>}
      <button className="button button--success" onClick={() => api && void voiceSession.join(api, channel.id)}>
        Entrar na call
      </button>
    </div>
  )
}

export function VoiceChannelView({ channel }: { channel: ChannelDto }): React.JSX.Element {
  const connectedHere = useVoiceStore((store) => store.connection?.channelId === channel.id)

  return (
    <main className="main-panel voice-channel-view">
      <header className="panel-header">
        <span className="panel-header__icon">🔊</span>
        {channel.name}
      </header>
      {connectedHere ? <VoiceStage /> : <JoinPrompt channel={channel} />}
    </main>
  )
}
