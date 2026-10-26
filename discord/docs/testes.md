# Testes e CI

O código que vale é o da versão **0.1.129**. O Node do projeto é o do arquivo `.nvmrc` na raiz do repositório: **22.23.4**. `engines` pede `>=22.23.0`.

O servidor importa `node:sqlite`. No Node 20, e no 22.12, esses módulos não carregam. A suíte e o typecheck rodam no 22.23, que é o que esta máquina usa.

## O que o GitHub roda

Push e pull request na `dev` disparam `.github/workflows/dev-checks.yml`: `npm ci`, `npm test` e `npm run typecheck` em `discord/`. Esse workflow não gera instalador e não cria Release.

O push na `qa` continua sendo o único que publica o desktop (`.github/workflows/qa-desktop.yml`). Antes de compilar, o job `verify` roda a mesma suíte e o typecheck. Se um dos dois falha, o job `publish` não começa.

A pull request de `dev` para `qa` também roda teste e typecheck (`.github/workflows/pr-tests.yml`).

Exemplo local, na pasta `discord/`:

```powershell
npm test
npm run typecheck
```

## Socket.IO de verdade

`apps/server/src/realtime/realtimeGateway.integration.test.ts` sobe a API numa porta livre (`listen` com porta `0`) e conecta um cliente `socket.io` de verdade.

- Sem token, ou com token inválido, o handshake termina em `unauthorized`. Se o `io.use` da autenticação sair do gateway, o cliente conecta e o teste falha.
- Com token válido, o outro cliente vê a presença, a mensagem `message:created`, o `typing:started`, o `voice:joined` e o `voice:left`.

## Me ouvir não recaptura

`liveKitMicrophone.test.ts` liga o microfone de mentira na `VoiceSessionController` e abre e fecha `setSelfMonitor`. A contagem de `setMicrophoneEnabled` fica igual e `restartTrack` continua em zero. O eco da preferência (`true`) não vira `{ exact: false }`.

`HearMyself.test.tsx` clica no botão. Na call ele chama a escuta do servidor e `setSelfMonitor(true)` depois `false`, e não chama `startLocalEar` nem republica o microfone. Fora da call ele usa só a escuta local.

`localEar.test.ts` abre e fecha essa captura à parte. O `getUserMedia` acontece uma vez, com eco `{ exact: false }`, e `setMicrophoneEnabled` da sala publicada não é chamado.

## Propriedades e valores exatos

`micGain.property.test.ts` usa fast-check. `listenerVolume.property.test.ts` fica só com o limitador: sample até 0,4 com ganho 1 sai igual, e o pico não passa de 1.

- Até 0,85 o limiter devolve o sample. Acima, o pico desce e não passa de 1. A curva de 0 a 1 é monótona.
- O portão grava exatamente 1 ou 0. O nivelador, com voz baixa, sobe um passo até o teto de 4× (`nextLevelerGain(1, rms, true)` é `1.24` quando o alvo encosta em 4). Desligado, o ganho é 1.
- As faixas de 0% a 200%, a volta para a mesma porcentagem, a subida monótona e o modo `direct` / `boost` / `silent` estão nos exemplos de `listenerVolume.test.ts`, com o número literal (`100` é ganho `1`, o teto é `2`). Assim um teto trocado para 4 ou um joelho em 0,7 falha o teste.

Os exemplos que só diziam "maior que 1" agora comparam o número. `1.08` é a voz baixa subindo um passo. `0.94` é a voz alta descendo um passo até o piso 0,25.

O contexto de áudio de mentira mora em `fakeWebAudio.ts`. O portão, a escuta local e o ganho de quem escuta usam o mesmo.

## Suíte sem repetição

A 0.1.128 tira o teste que só repetia outro arquivo. Mute e ensurdecer ficam em `micDeafen.test.ts`; a store guarda só "alterna mute e ensurdecer". O volume inicial da tela fica em `screenAudioVolume.test.ts`. O teste de 50 pessoas da call fica só no `voicePresenceHub`. Os três "me ouvir" da sessão viram uma tabela `it.each`: o vitest conta cada linha, então a suíte vai de 448 para 427 testes (31 shared, 296 desktop, 100 server), não para 424.

## Consulta da release e ordem do log

O agendador de teste do `releasePoller` guarda o tick e `fire()` executa a consulta do intervalo. Depois do `stop`, `fire()` não consulta de novo.

Os testes da sessão de voz e da troca de canal não usam mais `log.slice(3)` nem `events.slice(1)`. Eles filtram o tipo do evento, então uma linha a mais no começo do log não quebra o teste.

## Mutação local

O Stryker não roda no GitHub. Na pasta `discord/`:

```powershell
npm run test:mutation
```

Ele usa `@stryker-mutator/core` e o vitest-runner, com `coverageAnalysis: perTest`, no arquivo `stryker.config.mjs`. O desktop cobre voz, stores, chat, update e `desktopUpdate`. O servidor cobre config, realtime, mensagens, canais, auth, http, o poller de release e usuários.

Medido nesta máquina, antes de apertar os testes fracos e depois:

| Escopo | Antes | Depois |
|---|---|---|
| desktop (3892 mutantes) | 62,54% (2429 mortos, 763 sobreviveram) | 64,05% (2488 mortos, 715 sobreviveram) |
| `micGain.ts` | 77,9% | 87,9% |
| `liveKitMicrophone.ts` | 68,4% | 97,4% |
| `speakingLevel.ts` | 61,4% | 90,9% |
| `localEar.ts` | 38,9% | 61,1% |
| `micLevel.ts` | 88,9% | 97,8% |
| server (642 mutantes) | 83,02% (533 mortos, 80 sobreviveram) | 85,83% (551 mortos, 67 sobreviveram) |
| `messageService.ts` | 76,7% | 93,0% |
| `releasePoller.ts` | 67,0% | 75,0% |
| `authService.ts` | 92,6% | 100% |
| `currentUser.ts` | 94,7% | 100% |

O 85,83% do servidor soma a rodada inteira (550 mortos) com o último mutante de `currentUser.ts`, morto numa rodada só desse arquivo.

Não entram na conta, porque o resultado observável não muda:

- No joelho 0,85, `<` e `<=` devolvem o mesmo sample: o excesso é zero.
- Ler um índice a mais em `peakSample` cai no silêncio 128.
- Escrever um ponto além da `Float32Array` da curva é ignorado.
- Esvaziar `setSelfMonitor` continua devolvendo `undefined`: a função já não recaptura.
- No clamp do limiter, `sample >= 1` e `sample > 1` tratam o sample 1 igual, porque os dois seguem para o compressor.
- No teto 4 do nivelador, `>=` e `>` devolvem 4 quando o alvo é exatamente 4.

## Typecheck do desktop

O `tsc` do desktop tinha erros antigos em tipos do Electron, do volume da tela e do PCM. A 0.1.124 corrige esses pontos para o comando fechar com sucesso. O app em si não muda de comportamento.
