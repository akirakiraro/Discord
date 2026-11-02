# Debug de áudio da call

Números da call, neste aparelho, para ver o que acontece com o som. O código que vale é o da versão **0.1.123**. O painel não muda o áudio e não cria supressão nova: ele mede.

## O que tem que continuar verdade

- Só o usuário cujo `username` de login é `akira` vê o botão e o painel. A comparação ignora maiúsculas e espaços nas pontas. O nome de exibição não abre o painel.
- Outra conta no mesmo PC não vê o botão **Áudio**. Não há atalho escondido.
- O painel fechado não chama `getStats`. Aberto, lê a cada 1 s e para ao fechar ou ao sair da call.
- A leitura fica neste processo. Não há pedido ao servidor, nem evento no socket, nem linha no relato do cliente. Copiar ou salvar o JSON também fica neste PC.
- Entra o microfone publicado por esta pessoa e o microfone de cada outra pessoa na sala. A escuta `:monitor` e o áudio de tela ficam de fora. O volume por pessoa listado é o deste aparelho, não o que os outros escolheram.

## Onde fica

O botão **Áudio** está na barra de voz da lateral, ao lado de sair da call. O painel abre fixo, ao lado da barra. **Fechar** ou clicar de novo em **Áudio** para. **Copiar JSON** põe o painel inteiro na área de transferência. **Salvar arquivo** baixa `soundroom-audio-<instante>.json` neste PC. Os dois servem para mandar quando o som estiver ruim.

## Cores

Vermelho é perda acima de 2% (2% exato fica amarelo), jitter acima de 30 ms, RTT ou jitter buffer médio acima de 150 ms, TCP, codec que não é Opus, captura ou contexto abaixo de 24 kHz, o Chromium com supressão, ganho automático ou isolamento de voz ligados, volume de alguém em 0%, ou mais de 10 pacotes/amostras de ocultação, NACK, FEC ou retransmissão no último segundo.

Amarelo é perda acima de 0,5% até 2%, jitter acima de 15 ms, RTT ou jitter buffer médio acima de 80 ms, caminho `relay`, cancelamento de eco ligado, slider ou leveler fora de 100%, limiter segurando mais de 5%, volume diferente de 100%, `outputLatency` acima de 80 ms, ou qualquer ocultação, NACK, FEC ou retransmissão no último segundo.

A primeira leitura de um contador acumulado (ocultação, NACK, FEC recebido, retransmissão, amostras inseridas ou removidas) mostra o número cru, sem Δ e sem cor. O Δ só existe a partir do segundo seguinte. `0` no Δ é verde: naquele segundo não houve evento novo.

`—` quer dizer que o browser ainda não informou o campo. Não é o mesmo que desligado.

## Como ler cada faixa

Cada pessoa tem um bloco **enviado** (o microfone deste PC) ou **recebido** (o microfone dela). O gráfico de cima é os últimos 60 s: perda, jitter e bitrate, um ponto por segundo.

| Valor | O que é | Se estiver ruim, a causa é |
| --- | --- | --- |
| Perda | Pacotes de voz que não chegaram no último segundo | Rede: Wi-Fi, Radmin em relay, ou o caminho da mídia. O processamento do microfone não perde pacote. Se só uma pessoa perde, o caminho é o dela. Se todo mundo perde, é este PC. |
| Jitter | Variação da chegada, em ms | Rede. Jitter alto com perda baixa ainda corta a voz. O Chromium não aparece aqui. |
| Bitrate | Bits de verdade entre duas leituras | Enquanto se fala, a publicação mira 128 kbps. Bem abaixo disso, com gente falando, o encoder ou o congestionamento está apertando. Silêncio também fica baixo: compare falando. A primeira leitura fica `—`. |
| Codec | O que foi negociado | Tem que ser `opus`. Outro nome é fallback. |
| Taxa e canais | Relógio e canais do codec | Opus costuma ser 48 kHz, mono. Isso é o codec, não a prova do que o microfone capturou. |
| RTT | Ida e volta do par ICE escolhido, em ms | Rede. Compare com o ping do host na mesma barra. Ping baixo e RTT alto: a API está perto e a mídia não. |
| Transporte | UDP ou TCP, e o tipo do candidate escolhido | `UDP · direto` é o caminho bom no Radmin. `TCP` segura a fila (head-of-line). `relay` não é caminho direto. Isso é rede, não tratamento de voz. |
| Pacotes recebidos, enviados, perdidos e bytes | Contadores crus do `inbound-rtp` ou `outbound-rtp` | Rede. A perda de cima é a conta do último segundo; estes números são o acumulado desde que a faixa nasceu. |
| Jitter buffer | `jitterBufferDelay / jitterBufferEmittedCount`, em ms, com a soma e o `n` crus | Rede e o buffer do receptor. Alto quer dizer que o browser segurou a voz para esconder atraso. Não é o jitter de chegada. |
| Amostras ocultadas e eventos de ocultação | `concealedSamples` e `concealmentEvents` | O decoder inventou som no lugar de pacote que faltou. Δ no último segundo: rede, ou jitter buffer curto demais. |
| Amostras inseridas e removidas | `insertedSamplesForDeceleration` e `removedSamplesForAcceleration` | O buffer esticou ou encurtou a voz para acompanhar o relógio. Δ frequente: relógio ou jitter, não o portão. |
| NACK | `nackCount`, pedidos de reenvio | Rede. O receptor pediu o pacote de novo. |
| FEC recebido e FEC descartado | `fecPacketsReceived` e `fecPacketsDiscarded` | Redundância do Opus. Recebido com Δ é correção em uso. Descartado é o acumulado que não serviu. |
| Retransmissões | `retransmittedPacketsReceived` ou, no envio, `retransmittedPacketsSent` | Rede. Pacote que viajou outra vez. |
| Nível de áudio e energia | `audioLevel` e `totalAudioEnergy` crus | A voz que o WebRTC mediu na faixa. Nível perto de zero com gente falando: a faixa está muda antes da rede. Energia só sobe com o tempo. |
| ICE local e ICE remoto | Tipo (`host`, `srflx`, `prflx`, `relay`) e UDP ou TCP de cada ponta do par escolhido | Rede. `local host UDP` com `remoto host UDP` é direto. `relay` ou `TCP` em qualquer ponta é o caminho ruim. |
| ICE e DTLS | `iceState` e `dtlsState` do transporte | Tem que estar `connected`. Outro texto é a mídia ainda não firmou. |

No envio, a perda e o jitter vêm do `remote-inbound-rtp` (o que o outro lado reportou). No recebimento, vêm do `inbound-rtp`.

## Captura do microfone

O bloco **Captura do microfone** lê a faixa original, a de antes do portão. O `mediaStreamTrack` público já é a saída do processador; `getSettings` usa `getSourceTrackSettings()`, e `getConstraints` / `getCapabilities` leem o `_mediaStreamTrack` interno.

| Valor | O que é | Se estiver ruim, a causa é |
| --- | --- | --- |
| Supressão, ganho automático, isolamento | `getSettings()` da captura | Tratamento de voz. Ligado, o Chromium manteve o módulo. É o caminho do som abafado. `desligado` é o que a 0.1.120 pede quando a opção da tela está off. |
| Cancelamento de eco | O mesmo `getSettings()` | Ligado não é o corte de agudos. Pode abaixar a voz quando a caixa toca. Amarelo, não vermelho. |
| Taxa da captura | `sampleRate` do `getSettings()` | Abaixo de 24 kHz é banda estreita, o som de telefone. Isso é o APM do navegador, não a rede. |
| Canais da captura | `channelCount` | `mono` é o esperado. |
| Dispositivo | Nome e `deviceId` da captura em uso | Confirma qual microfone o Chromium abriu. |
| getSettings, getConstraints, getCapabilities | JSON cru, chaves em ordem | O que foi aplicado, o que foi pedido e o que o aparelho aceita. `{}` é objeto vazio. `—` é campo ausente. |

## Cadeia, contexto e volume

A cadeia só existe com o microfone da call ligado. Sem isso o painel diz que a cadeia ainda não está ligada. Os números vêm do `SensitivityGate` deste processo. Não mudam o som e não saem da máquina.

| Valor | O que é | Se estiver ruim, a causa é |
| --- | --- | --- |
| Ganho do slider | Volume do microfone na tela. 100% é 1, o sinal cru | Acima ou abaixo, este PC altera o que os outros ouvem. Não é rede. |
| Nível do leveler | Ganho do nivelador nosso, antes do limiter | Fora de 100%, o nivelador está mexendo no nível. Desligado, fica em 100%. |
| Atenuação do limiter | Quanto o joelho de 0,85 segurou o pico do analyser | Acima de 5%, o pico está sendo amassado. A voz pode soar mais dura. |
| Portão | Aberto ou fechado | Fechado, o som não segue para a call. É o limite de sensibilidade, não a rede. |
| Nível antes do portão e limite | dB medidos e o corte configurado | Se o nível fica abaixo do limite, o portão não abre. |
| Nivelador | Ligado ou desligado na preferência | Não é o AGC do Chromium. |
| Taxa do contexto | `AudioContext.sampleRate` da cadeia do microfone | Abaixo de 24 kHz é banda estreita neste processamento. |
| baseLatency e outputLatency | Atraso que o contexto declara, em ms | `outputLatency` acima de 80 ms é o aparelho de som segurando a saída. Não é RTT. |
| Volume de cada pessoa | O slider de 0% a 200% deste PC | 100% não altera a faixa. 0% cala essa pessoa só aqui. Outro valor é ganho local. A escuta `:monitor` não entra. |

## Gráfico e eventos

O gráfico guarda 60 pontos por faixa. O segundo mais antigo sai. Quem saiu da call sai do gráfico.

O log guarda os últimos 40 fatos, com hora local `hh:mm:ss`:

- `entrou` e `saiu`: alguém passou a ter, ou deixou de ter, microfone na leitura. A primeira abertura não marca quem já estava.
- `reconectou`: a sala do LiveKit disparou reconexão ou a mídia voltou. Não é deduzido do `getStats`.
- `transporte`: o texto UDP/TCP e o tipo do candidate mudaram.
- `microfone`: o dispositivo da captura mudou.

## JSON

O arquivo tem `lidoEm`, `faixas`, `captura`, `cadeia`, `volumes`, `contexto`, `historico` e `eventos`. Não leva token, URL do servidor nem nome de sessão. Exemplo de uso: abrir o painel, falar um segundo, clicar em **Copiar JSON** e colar na conversa.

## Onde está

| Peça | Onde |
| --- | --- |
| Quem vê, textos, cores, intervalo | `apps/desktop/src/renderer/src/lib/voice/callAudioProbe.ts` |
| Leitura do `RTCStatsReport` | `apps/desktop/src/renderer/src/lib/voice/rtcAudioLeg.ts` |
| Campos crus e o Δ | `apps/desktop/src/renderer/src/lib/voice/probeRaw.ts` |
| Gráfico de 60 s, eventos e JSON | `apps/desktop/src/renderer/src/lib/voice/probeTrace.ts` |
| Cadeia, contexto, volume e `getSettings` | `apps/desktop/src/renderer/src/lib/voice/probeChain.ts` |
| Faixas da sala, sem enviar | `apps/desktop/src/renderer/src/lib/voice/collectCallAudioProbe.ts` |
| Botão, painel, copiar e salvar | `apps/desktop/src/renderer/src/components/voice/CallAudioProbe.tsx` |

## Como testar

Reabra o desktop (`npm run desktop` a partir de `discord/`) na conta `akira` e em outra conta.

1. Na outra conta, entre numa call. A barra de voz não tem o botão **Áudio**.
2. Em `akira`, entre na mesma call. O botão aparece. Aberto, cada pessoa ganha um bloco, e o seu é **enviado**.
3. Fale. No segundo seguinte o bitrate do enviado sobe. Perda e jitter em UDP direto, no Radmin, ficam baixos. O gráfico começa a traçar.
4. Em Configurações → Voz, a supressão desligada tem que aparecer **desligado**. O slider em 100% aparece **100%** na cadeia. O volume da outra pessoa aparece no bloco de volume.
5. **Copiar JSON** ou **Salvar arquivo**. O texto tem `historico` e `eventos` e não tem token.
6. Feche o painel. Ele para de ler. Sair da call também fecha.

O microfone real, a caixa e o app no Windows não foram medidos daqui.
