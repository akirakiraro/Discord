# Sons de entrar e sair da call

O que o desktop toca quando alguém entra ou sai da call em que você está. O código que vale é o da versão **0.1.116**. Quem está só olhando a barra não ouve: o roster do host avisa a lista, e o sino não usa essa lista.

## O que tem que continuar verdade

- Entrar na call toca a subida, uma vez. As pessoas que já estavam na sala não tocam junto.
- Outra pessoa entrando toca a subida. Outra pessoa saindo toca a descida. Vale para todo mundo que está nessa call.
- Sair da call, a call cair, ou trocar de canal toca a descida. O canal novo toca a subida, de novo sem a rajada de quem já está lá.
- Os dois sons são diferentes, senoidais, e duram menos de 0,6 s. Entrada: 523 Hz e depois 659 Hz. Saída: o contrário. Não há WAV de terceiro.
- A escuta invisível (`id:monitor`), uma faixa de tela e qualquer identidade com `:` ou que não seja uma pessoa padrão do LiveKit ficam mudas.
- Se a mesma pessoa sai e volta em menos de 800 ms, a volta não toca. Duas entradas ou duas saídas nesse intervalo também não. Entrar e sair de verdade, mesmo rápido, toca os dois.
- Na reconexão da sala inteira o LiveKit tira todo mundo e põe de volta. Isso não toca. Só toca a saída de quem não voltou.
- A chave desligada não toca. O volume 0 também não. Surdo não toca, mesmo com a chave ligada.
- Falha ao tocar, `setSinkId` recusado ou autoplay bloqueado não derruba a call.

## Onde está

| Peça | Onde |
| --- | --- |
| Qual som, dedupe, sem rajada, monitor | `apps/desktop/src/renderer/src/lib/voice/callChime.ts` |
| Reconexão e o turno da saída | `apps/desktop/src/renderer/src/lib/voice/callChimeGate.ts` |
| Notas e `AudioContext` | `apps/desktop/src/renderer/src/lib/voice/callChimePlayer.ts` |
| Liga na sala que já existe | `apps/desktop/src/renderer/src/lib/voice/voiceSession.ts` e `voiceSessionController.ts` |
| Chave e volume | `micPreferences.ts`, `micPrefsStore.ts`, `components/user/VoiceSettings.tsx` |

O `AudioContext` nasce no clique de entrar ou de sair, antes do primeiro `await`. O Chromium prende o autoplay nesse gesto. Um som que chega depois, com a call já aberta, reusa esse contexto.

## Surdo

O ponto de extensão é `isCallSoundSilenced`. Hoje ela devolve o `deafened` do `voiceStore`, o mesmo flag da 0.1.113. O tocador não conhece o botão. Outra fonte de surdez entra só nessa função.

Enquanto surdo, a call continua anotando quem entrou e saiu. Desensurdecer não repete o que já passou.

## Dispositivo de saída

Não há um seletor de alto-falante nesta versão. Se o LiveKit já tiver um `audiooutput` ativo, ou se algum `<audio>` da call já estiver num dispositivo que não é `default`, o sino usa esse id em `AudioContext.setSinkId`. Sem id, sem `setSinkId`, ou se a chamada falhar, o som segue no dispositivo do sistema.

## Preferências

Ficam no mesmo `localStorage` do microfone (`radcord.mic`).

- `callSounds` começa ligado. Uma preferência antiga, sem o campo, também fica ligada.
- `callSoundVolume` vai de 0 a 1 e começa em 0,7. O oscilador ainda limita o pico, para 100% não estourar.

## Como testar nos dois PCs

O host não muda. Reabra o desktop nos dois (`npm run desktop` a partir de `discord/`).

1. Os dois no mesmo canal. Quem entra ouve a subida uma vez, não uma vez por pessoa que já estava.
2. O outro entra: os dois ouvem a subida. Um sai: quem ficou ouve a descida, e quem saiu também.
3. Trocar de canal: descida no antigo, subida no novo. Quem já está no novo não dispara uma rajada.
4. Configurações → Voz: desligar "Sons de entrar e sair da call" cala os próximos. O volume muda o que ainda toca.
5. Ensurdecer e pedir para alguém entrar: sem sino. Desensurdecer não toca o que já passou.
6. Me ouvir não pode tocar um sino extra. A identidade é `…:monitor`.
