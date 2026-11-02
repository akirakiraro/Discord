# Área de testes

O que a versão **0.1.136** oferece para simular gente na call sem chamar ninguém. Nada disto vai para o instalador.

## O que tem que continuar verdade

- A área só existe no `npm run desktop`. O botão **Testes** fica na barra de voz, ao lado de **Áudio**, e só aparece com a call conectada.
- O instalador não leva nada dela. O código continua na `qa`, mas fica atrás de `import.meta.env.DEV`: no build do instalador esse teste vira `false` e o bundler descarta o bloco e o arquivo importado. O workflow `qa-desktop.yml` roda `scripts/check-no-dev-tools.mjs` depois de compilar e para a release se achar qualquer pedaço da área no `apps/desktop/out`.
- **Adicionar bot** abre um processo `node` com `apps/test-bot`. O bot entra no canal em que você está como "Bot de teste N", com a identidade `dev-bot-N`. Ele aparece na call como uma pessoa: anel de fala, volume por pessoa, som de entrar e sair e painel **Áudio**. A identidade não tem `:` de propósito: com `:` o som de entrar e sair trataria o bot como a escuta `:monitor`.
- **Sinal de teste** toca, em loop, um som parecido com fala (tom grave com harmônicos, sílabas de 250 ms e pausas), com frases a −20, −30 e −50 dB. A de −50 dB é a voz baixa que o portão antigo, em byte, não via. **Tocar WAV…** toca um arquivo seu, PCM de 16 bits, mono ou estéreo, em loop. **Parar** silencia. **Remover** tira o bot da call e, se ele não sair em 3 s, mata o processo.
- No máximo 9 bots ao mesmo tempo. Fechar o app derruba todos.
- O bot pede o token à API em `POST /dev/bot-token`, com a sessão de quem clicou. A rota só existe com `RADCORD_DEV_TOOLS=1`; sem isso o host responde 404 e o bot diz o que fazer. Mesmo ligada, a rota exige alguém logado.
- O "Ligar host neste PC" do `npm run desktop` já sobe a API com `RADCORD_DEV_TOOLS=1`. O app instalado e o `npm run host` do terminal não ligam.
- O bot ainda não aparece na lista debaixo do canal, na barra lateral: essa lista vem do socket de quem logou, e o bot só entra no LiveKit.

## Pelo terminal

Sem o app, na pasta `discord/`, com o host no ar e a rota ligada:

```powershell
npm run bot -- --api http://26.x.x.x:3000 --sessao <token de sessão> --canal geral --tocar tom
```

- `--canal` aceita o id ou o nome do canal de voz.
- `--numero` escolhe o N do "Bot de teste N" (1 a 99, padrão 1).
- `--tocar` é `tom` ou o caminho de um WAV. Sem ele o bot entra calado.
- Com o bot no ar, digite no terminal: `tom`, `tom loop`, `wav C:\caminho\fala.wav`, `wav loop ...`, `parar` ou `sair`.
- O bot escreve uma linha JSON por evento (`joined`, `playing`, `idle`, `error`, `left`). Os logs do LiveKit também saem no terminal.

Para ligar a rota num host aberto pelo terminal, defina a variável antes:

```powershell
$env:RADCORD_DEV_TOOLS = "1"
npm run host
```

## Onde está

| Peça | Onde |
| --- | --- |
| Bot (Node, `@livekit/rtc-node`) | `apps/test-bot/src/` |
| Sinal de teste | `apps/test-bot/src/testSignal.ts` |
| Rota do token e a trava `RADCORD_DEV_TOOLS` | `apps/server/src/devtools/devBotRoutes.ts`, `apps/server/src/config.ts` |
| Contrato `dev-bot-N` | `packages/shared/src/devToolsContract.ts` |
| Processos dos bots no Electron | `apps/desktop/src/main/dev/` |
| Ponte do preload (`window.radcordDev`) | `apps/desktop/src/preload/index.ts`, só dentro do `if (import.meta.env.DEV)` |
| Painel | `apps/desktop/src/renderer/src/components/dev/DevBotsPanel.tsx` |
| Trava do instalador | `scripts/check-no-dev-tools.mjs`, passo "Área de testes fora do instalador" do `qa-desktop.yml` |

## O que este ambiente não prova

A rota, o token, o bot achando o canal e o erro de cada caso foram testados contra a API de verdade. A entrada na sala e o áudio chegando no app precisam de um LiveKit no ar, no Windows do host. Para conferir, abra o `npm run desktop`, ligue o host, entre na call e clique em **Testes** → **Adicionar bot** → **Sinal de teste**.
