# Voz do microfone

O que o desktop captura do microfone e publica na call. O caminho cru, o ganho e o bitrate são os da versão **0.1.120**. O abafado do isolamento de voz foi tratado na **0.1.112** e continua valendo. Se a voz sair abafada ou "mais ou menos" no SoundRoom e nítida no Discord, com o mesmo microfone, comece por aqui.

Na 0.1.112 esta captura entra junto com a lista de quem está no canal, em [arquitetura.md](arquitetura.md), e com o botão Me ouvir, em [escuta-propria.md](escuta-propria.md). O isolamento desligado com `{ exact: false }` serve às duas: tira o abafado e deixa o retorno da escuta passar.

## O que tem que continuar verdade

- O portão de sensibilidade só abre e fecha o volume. Não filtra frequência.
- O slider de volume muda o ganho antes do portão. 100% é ganho 1. Não é um segundo controle automático.
- O ganho automático da tela sobe o nível no Web Audio. Não pede `autoGainControl` ao Chromium.
- Quem escuta a própria voz não recaptura o microfone e não troca o eco. O retorno assina a faixa que já está publicada. Fora da call, o teste local ainda abre uma captura à parte. O detalhe está em [escuta-propria.md](escuta-propria.md).
- Em 100%, quem ouve outra pessoa não processa a voz: um elemento de áudio toca a faixa com volume 1. Acima de 100% o ganho é só neste aparelho, num elemento mudo cujo `srcObject` alimenta o contexto da sala. O detalhe está em [volume-por-pessoa.md](volume-por-pessoa.md).

## Por que saía abafada

Num teste com duas pessoas, em PCs Windows diferentes, a voz de uma chegava muito abafada. No Discord, o mesmo microfone saía nítido. Trocar o dispositivo e mexer nas configurações de voz do SoundRoom não resolvia.

A cadeia era esta:

1. O `getUserMedia` do microfone passava supressão, eco e ganho automático como booleanos. No Chromium, `false` solto é só um ideal: o módulo de processamento (APM) pode continuar ligado. Com a supressão ligada, esse módulo trabalha em banda estreita, perto de 16 kHz, e corta os agudos. É o som de telefone. O Discord não usa esse APM.
2. O padrão do `livekit-client` ainda liga `voiceIsolation: true`. O SoundRoom não mandava esse campo, então o merge do SDK preenchia com `true`. Quando o navegador aceita o isolamento, ele ignora a supressão que a pessoa desligou. O interruptor da tela não tinha efeito.
3. A publicação usava o preset `music` do LiveKit, 48 kbps. A voz nítida do Discord fica na casa de 64 a 96 kbps, mono. 48 kbps sozinho não explica o "muito abafada", mas não guarda o agudo que o APM já tinha tirado.
4. O portão manda o microfone por um `MediaStreamAudioDestinationNode`. Esse nó nasce estéreo. O Opus estéreo divide o bitrate entre dois canais, e a voz é um canal só.

Não havia filtro passa-baixa nosso. O analyser do portão fica numa derivação, fora do áudio que segue para a call. A taxa pedida ao microfone não era fixa: sem `sampleRate`, o APM escolhia a banda estreita. DTX e RED não cortam agudo. O RED continua, porque um pacote UDP perdido na rede do Radmin vira buraco; o DTX sai, porque em LAN o silêncio não precisa economizar e a consoante some.

## O que mudou

| Peça | Onde |
| --- | --- |
| Captura, padrão e publicação | `apps/desktop/src/renderer/src/lib/voice/micPreferences.ts` |
| Sala sem o `voiceIsolation` do SDK | `apps/desktop/src/renderer/src/lib/voice/voiceSession.ts` |
| Bitrate na hora de publicar | `apps/desktop/src/renderer/src/lib/voice/liveKitMicrophone.ts` |
| Portão em um canal | `apps/desktop/src/renderer/src/lib/voice/sensitivityGate.ts` |
| Medidor com as mesmas constraints | `apps/desktop/src/renderer/src/components/user/useMicLevel.ts` |
| Texto em Configurações de voz | `apps/desktop/src/renderer/src/components/user/VoiceSettings.tsx` |
| Cadeia de ganho, limiter e nivelador | `apps/desktop/src/renderer/src/lib/voice/micGain.ts` |

- Supressão de ruído e ganho automático começam desligados. Preferência salva numa revisão antiga também perde esses dois. Quem ligar de novo, na revisão 2, fica como escolheu. O cancelamento de eco continua ligado: ele não é o corte de agudos, e sem ele a caixa de som volta para o microfone.
- Desligar um processamento manda `{ exact: false }`. Ligar manda `true`.
- `voiceIsolation` vai sempre `{ exact: false }`, na captura e no fallback da sala.
- A captura pede 48 kHz e um canal, como ideal, para um microfone que não tenha essa taxa ainda abrir.
- A faixa do microfone publica com `AudioPresets.musicHighQuality` (96 kbps), `forceStereo: false`, `dtx: false` e `red: true`. O áudio da tela não usa esse preset.
- O destino do portão fica com `channelCount` 1.

A 0.1.112 publicava a 96 kbps e, com o ganho automático ligado, mandava `autoGainControl: true`. A 0.1.120 tirou as duas coisas. O que vale agora está na seção seguinte.

A API e o LiveKit do host não entram nessa cadeia. Eles não reamostram a voz.

## O que vai cru e o que vai tratado

A partir da **0.1.120**, com supressão, cancelamento de eco e ganho automático desligados na tela, o Chromium não trata o microfone. A voz que a galera ouve não é o `MediaStreamTrack` cru do `getUserMedia`: ela passa por um processador nosso antes do `replaceTrack`. Esse processador não tem filtro, compressor de banda nem o APM do navegador.

| Etapa | Com as três opções desligadas |
| --- | --- |
| `getUserMedia` | Supressão, eco, `autoGainControl` e `voiceIsolation` vão `{ exact: false }`. `false` solto o Chromium ignora. 48 kHz e um canal são `ideal`: um microfone que não tenha essa taxa ainda abre. |
| Web Audio, no track publicado | Nivelador em ganho 1. Slider em 1 quando está em 100%. Limiter que é a reta até 0,85 e só segura pico acima disso. Portão que multiplica por 1 ou por 0. Destino mono. |
| Opus | 128 kbps, mono (`forceStereo: false`), sem DTX, com RED. |
| Quem ouve | O `RoomAudioRenderer` toca a faixa. Não filtra. |

O que continua de propósito, e por isso não é "o microfone bit a bit":

- O portão. Abaixo do traço, a call recebe silêncio. Não corta agudo.
- O slider, quando sai de 100%. 400% é ganho 4 no mesmo nó, com o limiter para não quadrar.
- Um resample, se o `AudioContext` da sala não estiver em 48 kHz. O LiveKit cria esse contexto com `latencyHint: 'interactive'` e sem `sampleRate`, na taxa da placa. O processador tem que usar esse contexto. Outro contexto a 48 kHz, como no áudio da tela, reinicia a placa e estala tudo. Se a placa já está em 48 kHz, não há essa volta.
- O Opus. 128 kbps mono é a faixa nítida. Não é o PCM do microfone.

`getSettings()` no track de captura, com as três desligadas, tem que vir com `echoCancellation`, `noiseSuppression`, `autoGainControl` e `voiceIsolation` falsos. Se algum vier `true`, o Chromium manteve o módulo. As constraints `googAutoGainControl`, `googNoiseSuppression`, `googHighpassFilter` e `googTypingNoiseDetection` não são mais aceitas no Chromium do Electron 44: mandá-las não desliga nada. O que desliga é `{ exact: false }` nos nomes padrão. O passa-alta do navegador mora dentro do APM e sai junto quando os quatro campos ficam desligados.

Se o dispositivo abrir em estéreo mesmo com `channelCount: { ideal: 1 }`, a cadeia fica com o canal 0. A média com um canal direito mudo tirava 6 dB e afinava a voz.

## Ganho automático do navegador abafa

Ligar "Ganho automático" na 0.1.112 mandava `autoGainControl: true`. No Chromium isso sobe o mesmo módulo de processamento da supressão, em banda estreita, e a voz volta abafada como no `voiceIsolation`. O interruptor da tela não tem mais esse efeito.

O ganho da tela é um `GainNode` antes do slider. Desligado, o ganho cola em 1. Ligado, empurra a voz baixa para perto de −20 dBFS e não passa de 4×, sem filtro. Silêncio não é amplificado. Trocar essa opção não recaptura o microfone: recapturar era o caminho em que o padrão do LiveKit (`voiceIsolation: true`, AGC, supressão) podia voltar.

O fallback da sala, quando algum campo falta, também pede os quatro desligados. O padrão do `livekit-client` 2.23 só preenche chave ausente. Como a captura manda as quatro, o `true` do SDK não entra.

## O slider de 400%

O slider "Volume do microfone" é o ganho da própria voz, antes do portão. Não é o volume da tela nem o volume com que esta pessoa ouve os outros.

Ele já escrevia `gain.value` num `GainNode` que fica no meio da cadeia publicada. No Chromium, atribuir `.value` não muda o som quando esse nó alimenta um `MediaStreamAudioDestinationNode`: o parâmetro só pega com `setValueAtTime`. Por isso 100% e 400% saíam iguais para quem escuta. O Me ouvir local tinha o mesmo defeito.

100% grava ganho 1. 400% grava ganho 4 no mesmo nó, sem `restartTrack`. O limiter segura o que passaria de 0,85. Abaixo disso o sample sai igual, então 100% não muda o timbre. Se o `AudioContext` estiver `suspended`, a cadeia pede `resume` ao ligar: contexto parado não entrega o ganho.

## Como comparar

Nos dois PCs, reabra o app (`npm run desktop` a partir de `discord/`). A nitidez do microfone não passa pela API.

1. Configurações → Voz. Desligue supressão, cancelamento de eco e ganho automático. O outro entra no canal e compara com o Discord no mesmo microfone. Tem que sair nítido, sem o som de telefone.
2. Me ouvir, falando acima do traço. É o mesmo áudio que a galera recebe, com o atraso da call. Fora da call, o Me ouvir toca a mesma cadeia neste PC.
3. Volume do microfone em 100% e depois em 400%, com o ganho automático desligado. Quem ouve (e o Me ouvir) nota a voz bem mais alta. Em 100% não há alteração. Se distorcer no teto, o limiter está segurando o pico, não um filtro.
4. Ligue só o ganho automático, com o slider em 100%. A voz baixa sobe. Não pode voltar abafada. Desligar devolve o nível, sem recapturar.
5. Ligue a supressão de propósito. Aí o abafado pode voltar: é o APM do navegador, e a tela diz isso.

## Mutar e ensurdecer

A partir da **0.1.113** os dois botões usam um estado só, em `lib/voice/micDeafen.ts`. O store chama esse estado. Não há atalho de teclado.

- Mutar alterna o microfone. Fica mutado até o próximo clique em mutar.
- Ensurdecer cala, juntos, o microfone e o áudio que chega: as outras pessoas e o áudio de tela. O clique guarda se o microfone já estava mutado.
- Não dá para ficar surdo e falando. Enquanto surdo, o microfone fica mutado. O LiveKit deixa de publicar a faixa, então quem está na call vê o mudo. O portão de sensibilidade não pede o microfone de novo.
- Clicar em mutar enquanto surdo não fica travado. Esse clique sai do surdo: microfone e áudio voltam juntos, mesmo que o microfone estivesse mutado antes.
- Clicar em ensurdecer de novo devolve o mute guardado. Se já estava mutado, continua mutado. Se não estava, volta a falar. O áudio dos outros volta nos dois casos.
- Mutado ou surdo, o Me ouvir não abre. Se já estava aberto, para. O botão de microfone continua clicável; o texto passa a **Desmutar e ouvir**.

## Medir a call

O usuário `akira` tem, na barra de voz, o botão **Áudio**. Aberto, ele mostra perda, jitter, bitrate, transporte e o `getSettings()` da captura. Outra conta não vê esse botão. O painel não muda o áudio e não manda número para o servidor. O que cada valor indica está em [diagnostico-audio.md](diagnostico-audio.md).
