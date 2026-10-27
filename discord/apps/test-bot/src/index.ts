import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { AudioSource, LocalAudioTrack, Room, RoomEvent, TrackPublishOptions, TrackSource } from '@livekit/rtc-node'
import { parseBotArgs } from './args'
import { formatEvent, type BotEvent } from './botEvents'
import { parseCommand, type BotCommand } from './commands'
import { requestBotToken, resolveVoiceChannel } from './hostCalls'
import { playClip } from './player'
import { speechLikeClip, TEST_SAMPLE_RATE } from './testSignal'
import { parseWav, type PcmClip } from './wav'

/**
 * Bot de teste da call. Entra no canal como "Bot de teste N" e toca o sinal de teste ou um WAV.
 * Exemplo, na pasta `discord/`:
 * `npm run bot -- --api http://26.1.2.3:3000 --sessao <token> --canal Geral --tocar tom`
 */
async function main(): Promise<void> {
  const args = parseBotArgs(process.argv.slice(2), process.env)
  const channel = await resolveVoiceChannel(args.apiUrl, args.session, args.channel, fetch)
  const grant = await requestBotToken(args.apiUrl, args.session, channel.id, args.botNumber, fetch)
  const room = new Room()
  await room.connect(grant.livekitUrl, grant.token, { autoSubscribe: false, dynacast: false })
  const source = new AudioSource(TEST_SAMPLE_RATE, 1)
  const track = LocalAudioTrack.createAudioTrack('bot-microfone', source)
  await room.localParticipant?.publishTrack(track, new TrackPublishOptions({ source: TrackSource.SOURCE_MICROPHONE, dtx: false, red: true }))
  emit({ event: 'joined', identity: grant.identity, displayName: grant.displayName, channel: channel.name })

  const control = botControl(source, room)
  room.on(RoomEvent.Disconnected, () => control.quit())
  if (args.play) control.run(args.play === 'tom' ? { kind: 'tone', loop: true } : { kind: 'wav', path: args.play, loop: true })
  createInterface({ input: process.stdin }).on('line', (line) => {
    const command = parseCommand(line)
    if (command) control.run(command)
    else emit({ event: 'error', message: `comando desconhecido: ${JSON.stringify(line.trim())}. Use tom, wav <arquivo>, parar ou sair.` })
  }).on('close', () => control.quit())
}

function botControl(source: AudioSource, room: Room): { run(command: BotCommand): void; quit(): void } {
  let current: ReturnType<typeof playClip> | null = null
  let leaving = false
  const stop = (): void => {
    current?.stop()
    current = null
  }
  const play = (clip: PcmClip, what: string, loop: boolean): void => {
    stop()
    const playing = playClip(source, clip, loop)
    current = playing
    emit({ event: 'playing', what, loop })
    void playing.done.then(() => {
      if (current === playing) {
        current = null
        emit({ event: 'idle' })
      }
    })
  }
  const quit = (): void => {
    if (leaving) return
    leaving = true
    stop()
    void room.disconnect().finally(() => {
      emit({ event: 'left' })
      process.exit(0)
    })
  }
  return {
    quit,
    run(command) {
      try {
        if (command.kind === 'tone') play(speechLikeClip(), 'sinal de teste', command.loop)
        else if (command.kind === 'wav') play(parseWav(readFileSync(command.path)), command.path, command.loop)
        else if (command.kind === 'stop') {
          stop()
          emit({ event: 'idle' })
        } else quit()
      } catch (error) {
        emit({ event: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    },
  }
}

function emit(event: BotEvent): void {
  process.stdout.write(`${formatEvent(event)}\n`)
}

main().catch((error: unknown) => {
  emit({ event: 'error', message: error instanceof Error ? error.message : String(error) })
  process.exit(1)
})
