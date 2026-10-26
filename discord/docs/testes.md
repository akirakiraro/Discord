# Testes e CI

O código que vale é o da versão **0.1.127**. O Node do projeto é o do arquivo `.nvmrc` na raiz do repositório: **22.23.4**. `engines` pede `>=22.23.0`.

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

`micGain.property.test.ts` e `listenerVolume.property.test.ts` usam fast-check.

- Até 0,85 o limiter devolve o sample. Acima, o pico desce e não passa de 1. A curva de 0 a 1 é monótona.
- O portão grava exatamente 1 ou 0. O nivelador, com voz baixa, sobe um passo até o teto de 4× (`nextLevelerGain(1, rms, true)` é `1.24` quando o alvo encosta em 4). Desligado, o ganho é 1.
- Volume de 0% a 200% vira ganho de 0 a 2. 100% é ganho 1 e toca no elemento, sem o limitador. Acima de 100% é ganho. O ganho não sai de 0 a 2.

Os exemplos que só diziam "maior que 1" agora comparam o número. `1.08` é a voz baixa subindo um passo. `0.94` é a voz alta descendo um passo até o piso 0,25.

O contexto de áudio de mentira mora em `fakeWebAudio.ts`. O portão, a escuta local e o ganho de quem escuta usam o mesmo.

## Consulta da release e ordem do log

O agendador de teste do `releasePoller` guarda o tick e `fire()` executa a consulta do intervalo. Depois do `stop`, `fire()` não consulta de novo.

Os testes da sessão de voz e da troca de canal não usam mais `log.slice(3)` nem `events.slice(1)`. Eles filtram o tipo do evento, então uma linha a mais no começo do log não quebra o teste.

## Typecheck do desktop

O `tsc` do desktop tinha erros antigos em tipos do Electron, do volume da tela e do PCM. A 0.1.124 corrige esses pontos para o comando fechar com sucesso. O app em si não muda de comportamento.
