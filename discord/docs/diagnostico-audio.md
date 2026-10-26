# Diagnóstico de áudio da call

Números da call, neste aparelho, para comparar com o Discord. O código que vale é o da versão **0.1.122**. O painel não muda o áudio e não cria supressão nova: ele mede.

## O que tem que continuar verdade

- Só o usuário cujo `username` de login é `akira` vê o botão e o painel. A comparação ignora maiúsculas e espaços nas pontas. O nome de exibição não abre o painel.
- Outra conta no mesmo PC não vê o botão **Áudio**. Não há atalho escondido.
- O painel fechado não chama `getStats`. Aberto, lê a cada 1 s e para ao fechar ou ao sair da call.
- A leitura fica neste processo. Não há pedido ao servidor, nem evento no socket, nem linha no relato do cliente.
- Entra o microfone publicado por esta pessoa e o microfone de cada outra pessoa na sala. A escuta `:monitor` e o áudio de tela ficam de fora.
- A primeira leitura da perda é o acumulado desde que o contador do WebRTC começou. Da segunda em diante, é o último segundo. O bitrate só aparece a partir da segunda leitura.

## Onde fica

O botão **Áudio** está na barra de voz da lateral, ao lado de sair da call. O painel abre fixo, ao lado da barra, para a lista de canais não cortar. **Fechar** ou clicar de novo em **Áudio** para.

## Como ler

Vermelho é perda acima de 2% (2% exato fica amarelo), jitter acima de 30 ms, RTT acima de 150 ms, transporte TCP, codec que não é Opus, captura abaixo de 24 kHz, ou o Chromium com supressão, ganho automático ou isolamento de voz ligados. Amarelo é perda acima de 0,5% até 2%, jitter acima de 15 ms, RTT acima de 80 ms, caminho `relay`, ou cancelamento de eco ligado.

| Valor | O que é | Se estiver ruim, a causa é |
| --- | --- | --- |
| Perda | Pacotes de voz que não chegaram no último segundo | Rede: Wi-Fi, Radmin em relay, ou o caminho da mídia. O processamento do microfone não perde pacote. Se só uma pessoa perde, o caminho é o dela. Se todo mundo perde, é este PC. |
| Jitter | Variação da chegada, em ms | Rede. Jitter alto com perda baixa ainda corta a voz. O Chromium não aparece aqui. |
| Bitrate | Bits de verdade entre duas leituras | Enquanto se fala, a publicação mira 128 kbps. Bem abaixo disso, com gente falando, o encoder ou o controle de congestionamento está apertando. Silêncio também fica baixo: compare falando. |
| Codec | O que foi negociado | Tem que ser `opus`. Outro nome é fallback. |
| Taxa e canais | Relógio e canais do codec | Opus costuma ser 48 kHz, mono. Isso é o codec, não a prova do que o microfone capturou. |
| RTT | Ida e volta do par ICE escolhido, em ms | Rede. Compare com o ping do host na mesma barra. Ping baixo e RTT alto: a API está perto e a mídia não. |
| Transporte | UDP ou TCP, e o tipo do candidate | `UDP · direto` é o caminho bom no Radmin. `TCP` segura a fila e a voz piora (head-of-line). `relay` não é caminho direto. Isso é rede, não tratamento de voz. |
| Supressão, ganho automático, isolamento | `getSettings()` da captura, antes do nosso portão | Tratamento de voz. Ligado, o Chromium manteve o módulo. É o caminho do som abafado. `desligado` é o que a 0.1.120 pede quando a opção da tela está off. |
| Cancelamento de eco | O mesmo `getSettings()` | Ligado não é o corte de agudos. Pode abaixar a voz quando a caixa toca. Amarelo, não vermelho. |
| Taxa da captura | `sampleRate` do `getSettings()` | Abaixo de 24 kHz é banda estreita, o som de telefone. Isso é o APM do navegador, não a rede. |
| Canais da captura | `channelCount` | `mono` é o esperado. |

`—` quer dizer que o browser ainda não informou o campo. Não é o mesmo que desligado.

## Onde está

| Peça | Onde |
| --- | --- |
| Quem vê, textos, cores, intervalo | `apps/desktop/src/renderer/src/lib/voice/callAudioProbe.ts` |
| Leitura do `RTCStatsReport` | `apps/desktop/src/renderer/src/lib/voice/rtcAudioLeg.ts` |
| Faixas da sala, sem enviar | `apps/desktop/src/renderer/src/lib/voice/collectCallAudioProbe.ts` |
| Botão e painel | `apps/desktop/src/renderer/src/components/voice/CallAudioProbe.tsx` |

O `getSettings()` vem de `getSourceTrackSettings()`: a captura original, não a faixa que já passou pelo portão.

## Como testar

Reabra o desktop (`npm run desktop` a partir de `discord/`) na conta `akira` e em outra conta.

1. Na outra conta, entre numa call. A barra de voz não tem o botão **Áudio**.
2. Em `akira`, entre na mesma call. O botão aparece. Aberto, cada pessoa ganha um bloco, e o seu é **enviado**.
3. Fale. No segundo seguinte o bitrate do enviado sobe. Perda e jitter em UDP direto, no Radmin, ficam baixos.
4. Em Configurações → Voz, a supressão desligada tem que aparecer **desligado** no bloco do Chromium. Se aparecer **ligado**, o navegador manteve o módulo: isso é tratamento de voz, não rede.
5. Feche o painel. Ele para de ler. Sair da call também fecha.

O microfone real, a caixa e o app no Windows não foram medidos daqui.
