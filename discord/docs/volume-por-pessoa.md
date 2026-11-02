# Volume de cada pessoa

O volume com que esta pessoa ouve cada uma das outras na call. Não é o slider "Volume do microfone" das configurações: aquele muda o que os outros recebem. Este muda só o que este aparelho recebe. O código que vale é o da versão **0.1.121**.

## O que tem que continuar verdade

- 0% é mudo. 100% é a faixa do LiveKit sem alteração. 200% é o dobro, com limitador só no pico.
- 100% não passa por ganho, limitador nem outro nó. O elemento de áudio toca a faixa com volume 1.
- Abaixo de 100% o volume é o do elemento, que já vai de 0 a 1. Não há Web Audio nesse caminho.
- Acima de 100% o volume do elemento não passa de 1. A faixa fica num `<audio>` mudo e o som sai de um `GainNode` no `AudioContext` da sala, gravado com `setValueAtTime`. O grafo lê o `srcObject` desse elemento. Um `MediaStream` novo em volta da faixa fica sem som no Chromium. Atribuir `.value` não pega em alguns nós.
- O limitador fica depois do ganho. Até 0,85 o sample vezes o ganho sai igual. Acima, encosta em 1 sem quadrar. Em 100% essa curva não está no caminho, então o pico também não muda.
- A preferência é deste aparelho e de quem está logado. Outra conta no mesmo PC não herda. Reentrar na call usa o valor salvo.
- Não há controle para a própria voz nem para a escuta invisível (`id:monitor`). O áudio da tela continua no slider "Som da tela".
- Surdo cala o microfone das outras pessoas e o áudio de tela, como antes. O volume salvo não fica por cima do surdo. Desensurdecer devolve o volume de cada pessoa.
- Quem ouve não manda esse ganho para o servidor. Os outros continuam recebendo a faixa cheia.

## Onde o ganho entra

O `RoomAudioRenderer` tocava todo áudio remoto num elemento, com volume no máximo 1. Ele saiu. No lugar, `CallPlayback` faz três caminhos:

| Quem | 100% ou menos | Acima de 100% | Surdo |
| --- | --- | --- | --- |
| Microfone de outra pessoa | Elemento, volume = ganho | Elemento mudo e, no mesmo `srcObject`, ganho e limitador no `AudioContext` da sala | A publicação para, como o renderer antigo fazia com `muted` |
| Áudio de tela remoto | O slider "Som da tela", no elemento | Não usa este volume | Para, junto com o resto |
| Própria voz, `:monitor` | Não toca aqui | Não toca aqui | Não toca aqui |

O contexto é o que o LiveKit já abre ao entrar na call (`latencyHint: 'interactive'`, taxa da placa). Criar outro reinicia a placa e estala a voz. O campo é interno do SDK; a leitura existe para não abrir um segundo.

O elemento mudo só entra acima de 100%. O Chromium não entrega faixa remota de WebRTC ao Web Audio se ela não estiver num `<audio>`. O `attach` do LiveKit deixa esse elemento com som; o app cala depois (volume 0 e `muted`). O grafo usa esse `srcObject`, o mesmo que o SDK usa quando o mix é dele. Em 100% esse elemento não existe: toca o de sempre, com volume 1.

O nó de ganho não aplica o 200% direto. A curva do limitador é fixa no teto de 200%, e o ganho antes dela é `volume / 2`. Assim 150% é 0,75 nesse nó, e a curva vê o sample como se o ganho fosse 1,5. O `WaveShaper` corta o que chega acima de 1, então o excesso tem que caber dentro da curva, não depois dela.

O clique fica na lista de quem está no canal de voz, com a call aberta. O painel mostra a porcentagem e o botão **Volume normal**, que grava 100%.

## Onde está

| Peça | Onde |
| --- | --- |
| Porcentagem, quem pode, limitador, `localStorage` | `apps/desktop/src/renderer/src/lib/voice/listenerVolume.ts` |
| Ganho com `setValueAtTime` e o contexto da sala | `apps/desktop/src/renderer/src/lib/voice/listenerBoost.ts` |
| Preferência deste aparelho | `apps/desktop/src/renderer/src/stores/listenerVolumeStore.ts` |
| Quem toca o quê | `apps/desktop/src/renderer/src/components/voice/CallPlayback.tsx` |
| Painel do clique | `apps/desktop/src/renderer/src/components/voice/ListenerVolumeToggle.tsx` |

A chave é `radcord.listenerVolume`. Um objeto por usuário logado, e dentro o ganho de cada pessoa. 1 é 100%. Sem chave, também é 100%.

## Como testar nos dois PCs

Reabra o desktop nos dois (`npm run desktop` a partir de `discord/`). Os dois no mesmo canal.

1. Sem mexer no volume, a voz do outro sai como antes. Isso é 100%.
2. Clique no nome do outro na lista do canal. O painel abre. Suba para 200%. A voz fica mais alta só neste PC. O outro não nota mudança na voz que ele recebe.
3. **Volume normal** volta ao ponto de antes. 50% baixa. 0% cala essa pessoa e deixa o resto.
4. Saia da call e entre de novo. O valor continua.
5. No outro PC, o volume dessa pessoa não mudou: a preferência não viaja.
6. Ensurdeça. Some o áudio de todo mundo, inclusive quem estava em 200%, e o áudio de tela. Desensurdeça. O 200% volta.
7. A própria linha na lista não abre o painel. Me ouvir não ganha esse slider.

O microfone real e a caixa não foram medidos daqui. O que o teste automático trava é o ganho, o limitador, a memória e o fato de o Me ouvir não recapturar.
