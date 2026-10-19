import { useState } from 'react'
import { ConnectScreen } from './components/ConnectScreen'
import { VoiceRoom } from './components/VoiceRoom'
import type { VoiceSession } from './lib/voiceSession'

export function App(): React.JSX.Element {
  const [session, setSession] = useState<VoiceSession | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  function leaveRoom(reason: string | null): void {
    setLastError(reason)
    setSession(null)
  }

  if (!session) {
    return <ConnectScreen initialError={lastError} onConnected={setSession} />
  }
  return <VoiceRoom session={session} onLeave={leaveRoom} />
}
