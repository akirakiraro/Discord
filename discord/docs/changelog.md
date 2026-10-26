# Changelog

## 0.1.130

O PC com o repositório clonado liga e desliga o host dentro do app.

- `npm run host:setup` (e o `host:install`) grava `infra/host/host-module.json`. Sem esse módulo a opção não aparece.
- A tela de entrar liga o host e preenche o IP `26.x`. Configurações → Host, por enquanto só para `akira`, mostra estado, log, confirmação antes de derrubar a call e o botão de firewall. Fechar o app desliga o host que ele subiu. Com o host ligado, a atualização espera. O detalhe está em [host-no-app.md](host-no-app.md).

## 0.1.129

Os testes fracos passam a pegar regressão de número. A mutação fica só na máquina local.

- `npm run test:mutation` roda o Stryker. Não entra no CI. O desktop foi de 62,54% para 64,05%. O servidor foi de 83,02% para 85,83%.
- Áudio, Me ouvir, página de mensagem, sessão e a consulta da release ganham asserts exatos. Mutante que não muda o resultado fica de fora. O detalhe está em [testes.md](testes.md).

## 0.1.128

A suíte perde o teste que só repetia outro arquivo. O que pega regressão de número continua.

- Mute e ensurdecer ficam em `micDeafen.test.ts`. A store só liga os dois. O volume de 0% a 200% fica nos exemplos, com o teto literal `2`.
- Os três "me ouvir" da sessão viram uma tabela. O vitest conta cada linha, então a suíte vai de 448 para 427 testes. O detalhe está em [testes.md](testes.md).

## 0.1.127

Os testes de áudio passam a pegar regressão de número, não só a direção.

- fast-check cobre o joelho do limiter, o teto de 4× do nivelador, o portão em 0 ou 1, e o volume de 0% a 200% com 100% igual a ganho 1.
- O fake de Web Audio fica num helper só. O agendador do poller de release executa o tick. Os testes deixam de depender da posição exata no log. O detalhe está em [testes.md](testes.md).

## 0.1.126

Teste de regressão do Me ouvir: abrir e fechar o monitor não recaptura a faixa publicada.

- O microfone de mentira conta `restartTrack` e `setMicrophoneEnabled`. Os dois ficam parados quando `setSelfMonitor` liga e desliga.
- O botão, na call, usa a escuta do servidor. Fora da call, a captura local não mexe na faixa da sala. O detalhe está em [testes.md](testes.md) e em [escuta-propria.md](escuta-propria.md).

## 0.1.125

O socket da API ganha um teste com servidor e cliente de verdade, numa porta livre.

- Handshake sem token ou com token inválido recebe `unauthorized`. Tirar a autenticação faz o teste falhar.
- Com sessão válida, o outro cliente vê presença, mensagem, digitação e a entrada e saída da call. O detalhe está em [testes.md](testes.md).

## 0.1.124

O GitHub passa a rodar `npm test` e o typecheck em todo push e pull request na `dev`. O Release continua só no push da `qa`, e agora só começa se esses dois comandos passarem.

- O Node fica fixo em `.nvmrc` (`22.23.4`) e em `engines` (`>=22.23.0`). O `node:sqlite` do servidor não carrega no Node 20 nem no 22.12.
- O typecheck do desktop volta a passar. O detalhe está em [testes.md](testes.md).

## 0.1.123

O painel **Áudio** do usuário `akira` passa a ser o debug completo da call, ainda só neste PC.

- Cada faixa mostra os contadores crus do `getStats`: pacotes, bytes, jitter buffer médio, ocultação, amostras inseridas e removidas, NACK, FEC, retransmissão, nível, energia, RTT e as duas pontas ICE (UDP/TCP, direto ou relay).
- A captura mostra `getSettings`, `getConstraints` e `getCapabilities` da faixa original, o dispositivo em uso, e a taxa e as latências do `AudioContext` do microfone.
- A cadeia mostra o slider, o leveler, a atenuação do limiter, o portão, e o volume por pessoa deste aparelho.
- Um gráfico guarda os últimos 60 s de perda, jitter e bitrate. Um log marca entrada, saída, reconexão, troca de transporte e troca de microfone, com hora.
- **Copiar JSON** e **Salvar arquivo** ficam neste PC. Nada vai ao servidor. O detalhe está em [diagnostico-audio.md](diagnostico-audio.md).

## 0.1.122

Painel de diagnóstico de áudio da call, só para o usuário `akira`.

- O botão **Áudio** fica na barra de voz, ao lado de sair da call. Outro usuário não vê o botão nem o painel.
- Aberto, lê `getStats` a cada 1 s neste PC: perda, jitter, bitrate, codec, taxa, canais, RTT e se a mídia vai por UDP ou TCP. Fechado, não lê.
- A captura mostra o que o Chromium aplicou de verdade (`getSettings`): supressão, eco, ganho automático, isolamento, taxa e canais.
- Nada disso vai para o servidor nem para os outros clientes. O detalhe está em [diagnostico-audio.md](diagnostico-audio.md).

## 0.1.121

Volume de cada pessoa na call, e o Me ouvir deixa de recapturar o microfone.

- Clicar numa pessoa do canal de voz abre o volume dela, de 0% a 200%. 100% toca a faixa como chegou, no elemento de áudio. Acima de 100% o ganho é neste aparelho, no contexto da sala, lendo o `srcObject` de um elemento mudo, com limitador só no pico. A preferência fica no `localStorage`, por quem está logado.
- Não vale para a própria voz, para a escuta `:monitor` nem para o áudio da tela. Surdo continua calando o que chega.
- Ligar ou desligar o Me ouvir não chama `restartTrack` e não troca o eco. A namorada do teste saía abafada e com ruído porque a escuta pedia o microfone de novo.
- O detalhe está em [volume-por-pessoa.md](volume-por-pessoa.md) e em [escuta-propria.md](escuta-propria.md).

## 0.1.120

Com as três opções de voz desligadas, o microfone deixa de passar pelo AGC do Chromium. O slider de volume passa a valer para quem ouve.

- Supressão, eco, ganho automático do navegador e `voiceIsolation` saem `{ exact: false }` quando a opção está desligada. O ganho automático da tela não pede `autoGainControl`: esse módulo abafa.
- O slider grava o ganho com `setValueAtTime`. 100% não altera. 400% é quatro vezes, com limiter só no pico. Não recaptura a faixa.
- A publicação do microfone sobe para 128 kbps mono, sem DTX, com RED.
- O detalhe do que vai cru e do que ainda passa pelo portão está em [audio-microfone.md](audio-microfone.md).

## 0.1.119

A atualização do app instalado não mostra a janela do NSIS.

- Depois do OK, a tela e o cartão entram em "Instalando..." e avisam que o SoundRoom vai fechar e reabrir sozinho. A barra dessa fase não tem porcentagem.
- Cerca de 1,5 s depois, o app chama `quitAndInstall(true, true)`. O instalador recebe `/S` e `--force-run`: a janela some e o SoundRoom abre de novo.
- O `installer.nsh` continua criando o atalho que falta e apagando `Radcord.lnk`, também no silencioso.
- Se a janela ainda aparecer (primeira instalação, ou se o silencioso falhar), o ícone é o do SoundRoom e os textos saem em português. O `appId`, o arquivo `Radcord-Setup-<versão>.exe` e a pasta `%APPDATA%\Radcord` não mudam.

## 0.1.118

O app passa a se chamar SoundRoom e troca o ícone.

- Janela, login, barra, textos de atualização, atalho, instalador e regras do firewall mostram SoundRoom.
- O ícone é o quadrado arredondado em gradiente verde-azulado, com fone e balão brancos. A fonte é `apps/desktop/build/icon.svg`. O `.ico` e os PNG saem desse arquivo.
- A sessão continua em `%APPDATA%\Radcord`. Mudar o `productName` sozinho faria o Electron abrir `%APPDATA%\SoundRoom`.
- O instalador publicado continua `Radcord-Setup-<versão>.exe`, o mesmo nome no `latest.yml` e no `.blockmap`. O `appId` continua `dev.radcord.desktop`.
- O executável dentro da pasta de instalação passa a `SoundRoom.exe`. A atualização acha a pasta antiga pelo registro desse `appId`.
- Pacotes `@radcord/*`, `RadcordLoopback.exe`, `radcord.db`, a chave `radcord`, o `User-Agent` `radcord-host` e o `localStorage` (`radcord.login`, `radcord.mic`) não mudam de nome.
- O título da release no GitHub passa a SoundRoom seguido da versão. A tag continua `v0.1.N`. O host lê a tag, não o título.

## 0.1.117

A atualização do app instalado acontece dentro da janela.

- Na abertura, o app empacotado consulta os Releases do GitHub. `npm run desktop` não consulta e não bloqueia o login.
- Enquanto não está em dia, a tela de entrar não aparece. No lugar, "Atualizando o Radcord...".
- O canto inferior direito mostra a fase, a barra e, quando o updater manda, a velocidade e o tamanho.
- O download começa sozinho. No fim, um modal do app pede OK. OK instala e reabre.
- Sem internet, com o GitHub fora ou no limite da API, a tela continua bloqueada e oferece "Tentar novamente". Falha de download faz o mesmo. O login não abre por causa da falha.
- O host consulta `https://api.github.com/repos/akirakiraro/Discord/releases/latest` a cada 2 minutos (`RELEASE_POLL_MS`). Sem token. Se a versão `0.1.N` sobe, o socket emite `app:release` para quem está logado e de novo para quem conecta depois.
- O app só baixa se a versão anunciada for maior que a instalada. Vale no meio de uma call.
- Um app já instalado numa versão anterior a esta ainda usa o diálogo nativo nessa única atualização.

## 0.1.116

Sons curtos de entrada e saída na call em que você está.

- Entrar toca duas notas subindo, uma vez. Quem já estava na sala não toca junto.
- Outra pessoa entrando ou saindo toca o som correspondente. Quem está fora da call não ouve.
- Sair, cair ou trocar de canal toca a descida. O canal novo toca a subida.
- A escuta `:monitor`, a faixa de tela e uma identidade auxiliar ficam mudas. Reconexão rápida do LiveKit não repete a sala.
- Configurações → Voz: chave "Sons de entrar e sair da call" (ligada) e o volume. Surdo deixa esses sons mudos.
- O áudio é gerado no app. Não há arquivo de som de terceiro.

## 0.1.113

Mutar e ensurdecer passam a seguir uma máquina só.

- Mutar alterna o microfone e fica assim até o próximo clique.
- Ensurdecer cala o microfone e o áudio recebido (as outras pessoas e o áudio de tela) ao mesmo tempo, e guarda o mute de antes.
- Surdo implica microfone mutado. O LiveKit deixa de publicar. O Me ouvir para e o portão não reabre a captura.
- O botão de mutar não trava. Clicar nele enquanto surdo desmuta o microfone e o áudio juntos.
- Clicar em ensurdecer de novo devolve o mute guardado: se já estava mutado, continua mutado.

## 0.1.112

Junta a lista de quem está no canal sem entrar na call, a voz nítida do microfone (48 kHz mono, 96 kbps, processamento com `{ exact: false }`) e o Me ouvir que solta o portão antes de reabrir o microfone.
