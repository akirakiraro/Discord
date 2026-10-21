import type { ChannelDto } from '@radcord/shared'
import { useTracks } from '@livekit/components-react'
import { Track } from 'livekit-client'
import { visibleScreenShares } from '../../lib/voice/visibleScreenShares'
import { voiceSession } from '../../lib/voice/voiceSession'
import { useSessionStore } from '../../stores/sessionStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { MemberListToggle } from '../members/MemberListToggle'
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
  const sharing = useSharingScreen(connectedHere)

  return (
    <main className={sharing ? 'main-panel voice-channel-view voice-channel-view--share' : 'main-panel voice-channel-view'}>
      {sharing ? <MemberListToggle floating /> : <ChannelHeader name={channel.name} />}
      {connectedHere ? <VoiceStage /> : <JoinPrompt channel={channel} />}
    </main>
  )
}

function ChannelHeader({ name }: { name: string }): React.JSX.Element {
  return (
    <header className="panel-header">
      <span className="panel-header__icon">🔊</span>
      <span className="panel-header__title">{name}</span>
      <MemberListToggle />
    </header>
  )
}

function useSharingScreen(connectedHere: boolean): boolean {
  const showOwnShare = useVoiceStore((store) => store.showOwnShare)
  const screens = visibleScreenShares(useTracks([Track.Source.ScreenShare]), showOwnShare)
  return connectedHere && screens.length > 0
}
