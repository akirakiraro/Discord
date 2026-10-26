# Escuta da própria voz

O botão **Me ouvir**, na aba Voz das configurações, toca o microfone desta pessoa depois que o áudio volta do LiveKit. Não é o monitor da tela. O monitor da tela está em [audio-tela.md](audio-tela.md).

O código que vale para o retorno é o da versão **0.1.112**, com o mute e o surdo da **0.1.113**. A partir da **0.1.121** ligar ou desligar o botão não recaptura o microfone publicado. A voz nítida do microfone está em [audio-microfone.md](audio-microfone.md). A lista de quem está no canal sem entrar na call está em [arquitetura.md](arquitetura.md).

## O que tem que continuar verdade

- Quem escuta entra de novo na mesma sala, com a identidade `id-do-usuário:monitor`. Essa conexão não publica e não aparece na lista do canal.
- O som é o que os outros recebem, com o atraso da call e com o portão de sensibilidade. Abaixo do traço, o servidor manda silêncio.
- Ligar ou desligar o Me ouvir não chama `restartTrack`, não troca constraints e não recria o portão. A faixa publicada é a mesma de antes do clique.
- O cancelamento de eco da call fica como a pessoa configurou. A escuta não desliga o eco para "deixar o retorno passar": esse `getUserMedia` novo era o que abafava a voz para quem ouve.
- Fora da call, o teste local ainda abre uma captura à parte, com eco e isolamento desligados. Essa captura não é publicada.
- Mutado ou surdo, o Me ouvir não abre e, se já estava aberto, para. O portão não pede o microfone de novo. Clicar em mutar enquanto surdo volta a falar e a ouvir; aí o botão pode abrir. Clicar em ensurdecer de novo só devolve o mute que estava antes.
- A URL é a mesma da call, `ws://IP-do-Radmin:7880`. Não há caminho por `localhost` nem por `127.0.0.1`.

## Por que a voz mudava para quem ouve

Num teste com duas pessoas, a voz estava normal. Assim que uma clicou em **Me ouvir**, quem ouvia passou a receber ruído e um som abafado. Desligar o botão não devolvia a faixa antiga: o microfone já tinha sido pedido de novo.

A cadeia era esta:

1. O clique chamava `setSelfMonitor(true)`.
2. Isso chamava `republishCapture`, que soltava o portão (`stopProcessor`) e em seguida `restartTrack`.
3. `restartTrack` para o `MediaStreamTrack` e chama `getUserMedia` de novo. No Windows, reabrir o dispositivo no meio da call não devolve o mesmo módulo: o Chromium pode nascer com o processamento de voz, em banda estreita. É o abafado.
4. A captura nova ainda forçava `echoCancellation: { exact: false }`, mesmo quando a preferência estava ligada. Sem o eco, a caixa e o próprio retorno entram no microfone. É o ruído.
5. O portão era criado outra vez em cima da captura nova. A faixa que seguia para o LiveKit já não era a de antes do clique.

O palpite de uma segunda `AudioContext` no Me ouvir não é o que o código fazia. A escuta na call não cria contexto: ela assina a faixa remota e toca num elemento. O contexto novo existe só no teste local, fora da call. O que degradava a faixa publicada era o `restartTrack`.

O retorno em si não precisa disso. A segunda conexão (`:monitor`) só assina o microfone que já está no ar. O eco da preferência continua valendo para a captura. Quem escuta ouve essa mesma faixa, com o atraso da call.

## O que mudou na 0.1.121

- `setSelfMonitor` não republica e não lê `getSettings()` para recusar a escuta. Eco ligado no Chromium deixa de ser motivo para pedir o microfone de novo.
- A captura publicada segue `captureOptions`. O flag de "estou me ouvindo" saiu dessa decisão.
- `monitorCapture` continua só no teste local, fora da call.

O que a 0.1.112 fez no retorno (elemento fora da tela, prazo de 8 segundos, relato no cliente) continua valendo. A parte que pedia o microfone de novo, não.

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

A 0.1.121 parou de republicar o microfone para contornar esse eco. O preço era a voz abafada para quem ouve. O retorno segue assinando a faixa que já está no ar.

## O que mudou na 0.1.112

A 0.1.121 desfez o primeiro item: soltar o portão e pedir o microfone de novo abafava a voz para quem ouve. O resto continua.

- Na 0.1.112 a escuta soltava o portão e pedia o microfone com eco desligado. Isso não vale mais.
- O clique toca um WAV mudo ainda no gesto, antes da ida ao servidor. No outro PC a VPN pode passar do tempo em que o navegador aceita um `play()` sozinho.
- A faixa tem de tocar em até 8 segundos. Assinatura, queda, autoplay e elemento mudo viram erro na tela e uma linha no relato do cliente (`Escuta da própria voz: …`), com `eco`, `voz`, `mic`, `rem`, `fonte` e a URL `ws://26.x:7880`. O token não entra nessa linha.
- O elemento fica fora da tela, com volume 1, sem `hidden`.
- O isolamento de voz sai desligado em toda captura do microfone, como `{ exact: false }`. `false` solto é só um ideal: o Chromium pode manter o módulo, que abafa a voz e come o retorno. O interruptor da interface nunca ofereceu isolamento; quem ligava era o padrão da biblioteca. A mesma captura pede 48 kHz mono. O bitrate atual está em [audio-microfone.md](audio-microfone.md).

## Como testar no PC que não é o host

Os dois PCs na mesma rede Radmin, os dois dentro do mesmo canal de voz, microfone ligado. Reabra o desktop nos dois (`npm run desktop` a partir de `discord/`).

1. No PC que não hospeda, entre na call e fale. Quem ouve anota o timbre.
2. Configurações → Voz. Fale acima do traço da sensibilidade e clique em **Me ouvir**.
3. Tem que sair a própria voz, com o atraso da call. O botão fica **Parar de me ouvir**.
4. Quem ouve compara de novo. Tem que ser a mesma voz de antes do clique, sem ruído novo e sem abafado.
5. **Parar de me ouvir**. A voz para quem ouve continua a mesma.
6. Se não sair som no retorno, a frase vermelha embaixo do botão diz o motivo. A mesma frase vai para o relato do cliente no host.

Repita no PC do host. Os dois têm que ouvir o próprio retorno, e nenhum dos dois pode mudar a voz que o outro recebe.

Para ver o relato, o host precisa estar no ar. O arquivo fica junto dos outros relatos do cliente.

## O que reiniciar

O Me ouvir e a nitidez do microfone estão no app. Feche e abra o desktop nos dois PCs (`npm run desktop` a partir de `discord/`, ou o instalador dessa versão). A lista de quem está no canal, que entra na mesma versão, só passa a valer depois de reiniciar o host e a API. O LiveKit em si não precisa cair só por causa da escuta.
