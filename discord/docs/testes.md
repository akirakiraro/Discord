# Testes e CI

O código que vale é o da versão **0.1.126**. O Node do projeto é o do arquivo `.nvmrc` na raiz do repositório: **22.23.4**. `engines` pede `>=22.23.0`.

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

## Typecheck do desktop

O `tsc` do desktop tinha erros antigos em tipos do Electron, do volume da tela e do PCM. A 0.1.124 corrige esses pontos para o comando fechar com sucesso. O app em si não muda de comportamento.
