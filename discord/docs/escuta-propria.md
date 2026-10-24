# Escuta da própria voz

O botão **Me ouvir**, na aba Voz das configurações, toca o microfone desta pessoa depois que o áudio volta do LiveKit. Não é o monitor da tela. O monitor da tela está em [audio-tela.md](audio-tela.md).

O código que vale é o da versão **0.1.111**.

## O que tem que continuar verdade

- Quem escuta entra de novo na mesma sala, com a identidade `id-do-usuário:monitor`. Essa conexão não publica e não aparece na lista do canal.
- O som é o que os outros recebem, com o atraso da call e com o portão de sensibilidade. Abaixo do traço, o servidor manda silêncio.
- Enquanto a escuta dura, o cancelamento de eco e o isolamento de voz ficam desligados. O Chromium trata o retorno como eco e apaga o alto-falante.
- A URL é a mesma da call, `ws://IP-do-Radmin:7880`. Não há caminho por `localhost` nem por `127.0.0.1`.

## O que aconteceu no teste com dois PCs

No PC que roda o host, o botão tocou. No outro PC da rede `26.x`, o microfone seguia na call e o botão não soltou som nenhum. Não apareceu erro.

## Causa

Certeza alta no que o código fazia de errado. Certeza média sobre qual desses pontos calou só o segundo PC: daqui não dá para abrir os dois Windows do teste.

Descartado: a escuta não depende do PC do host para achar o LiveKit. `npm run host` grava `LIVEKIT_PUBLIC_URL` e o `node_ip` no IP `26.x`. Os dois clientes recebem essa URL no token. A call do outro PC já usa o mesmo endereço, a mesma porta e a mesma faixa UDP. Se a call tem áudio, o segundo participante alcança o servidor.

O que o código engolia, e por isso o botão ficava verde sem mensagem:

- `setSubscribed` e `startAudio` eram chamados com `void`. Se a assinatura ou o `play()` falhasse, a promessa se perdia. A tela não mudava e o relato do cliente não dizia o que faltou.
- Se a faixa do próprio microfone não chegasse, não havia prazo. Silêncio para sempre.
- O elemento usava o atributo `hidden` (`display: none`). Em alguns Chromium isso não chega a tocar.

O que faz o Chromium zerar o retorno, sem lançar exceção:

- O cancelamento de eco ligado come o áudio que volta do servidor. A escuta já pedia `echoCancellation: false`, mas só republicava o microfone quando a preferência da pessoa estava ligada. Com a preferência já desligada, a captura antiga continuava.
- O `livekit-client` 2.23 junta `voiceIsolation: true` em todo `getUserMedia` que não diga o contrário. Esse módulo também trata o retorno como eco. A escuta não desligava isso.
- O portão de sensibilidade segura o dispositivo num `AudioContext`. O `restartTrack` do SDK pede o microfone de novo antes de soltar esse nó. Em parte dos drivers do Windows a captura nova nasce com o eco ainda ligado. No PC do host a troca passa; no outro, o retorno continua mudo. Isso explica a diferença entre os dois PCs, e é o ponto que só o teste real confirma.

O portão em si não muda de PC para PC. Se a barra fica à esquerda do traço, os dois ouvem silêncio no retorno, porque é o áudio publicado. A dica do botão passa a dizer isso.

## O que mudou

- A escuta solta o portão, pede o microfone com eco e isolamento desligados, e lê `getSettings()`. Se o Chromium manteve um dos dois, o botão volta e a frase diz qual.
- O clique toca um WAV mudo ainda no gesto, antes da ida ao servidor. No outro PC a VPN pode passar do tempo em que o navegador aceita um `play()` sozinho.
- A faixa tem de tocar em até 8 segundos. Assinatura, queda, autoplay e elemento mudo viram erro na tela e uma linha no relato do cliente (`Escuta da própria voz: …`), com `eco`, `voz`, `mic`, `rem`, `fonte` e a URL `ws://26.x:7880`. O token não entra nessa linha.
- O elemento fica fora da tela, com volume 1, sem `hidden`.
- `voiceIsolation: false` vai em toda captura. O interruptor da interface nunca ofereceu isolamento de voz; quem ligava era o padrão da biblioteca.

## Como testar no PC que não é o host

Os dois PCs na mesma rede Radmin, os dois dentro do mesmo canal de voz, microfone ligado.

1. No PC que não hospeda, abra Configurações → Voz.
2. Fale acima do traço da sensibilidade e clique em **Me ouvir**.
3. Tem que sair a própria voz, com o atraso da call. O botão fica **Parar de me ouvir**.
4. Se não sair som, a frase vermelha embaixo do botão diz o motivo. A mesma frase vai para o relato do cliente no host.

Repita no PC do host. Os dois têm que ouvir.

Para ver o relato, o host precisa estar no ar. O arquivo fica junto dos outros relatos do cliente.

## O que reiniciar

A mudança é no renderer do desktop. Feche e abra o app nos dois PCs (`npm run desktop` a partir de `discord/`, ou o instalador dessa versão). Não precisa derrubar a API nem o LiveKit só por causa disso.
