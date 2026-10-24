# Voz do microfone

O que o desktop captura do microfone e publica na call. O código que vale é o da versão **0.1.112** em diante. Se a voz de alguém sair abafada no Radcord e nítida no Discord, com o mesmo microfone, comece por aqui.

Na 0.1.112 esta captura entra junto com a lista de quem está no canal, em [arquitetura.md](arquitetura.md), e com o botão Me ouvir, em [escuta-propria.md](escuta-propria.md). O isolamento desligado com `{ exact: false }` serve às duas: tira o abafado e deixa o retorno da escuta passar.

## O que tem que continuar verdade

- O portão de sensibilidade só abre e fecha o volume. Não filtra frequência.
- O slider de volume muda o ganho antes do portão. Não é um segundo controle automático.
- Quem escuta a própria voz fica sem cancelamento de eco enquanto a escuta durar. O Chromium trata o retorno do servidor como eco.
- A reprodução de quem ouve não processa a voz. O `RoomAudioRenderer` entrega a faixa do LiveKit num elemento de áudio.

## Por que saía abafada

Num teste com duas pessoas, em PCs Windows diferentes, a voz de uma chegava muito abafada. No Discord, o mesmo microfone saía nítido. Trocar o dispositivo e mexer nas configurações de voz do Radcord não resolvia.

A cadeia era esta:

1. O `getUserMedia` do microfone passava supressão, eco e ganho automático como booleanos. No Chromium, `false` solto é só um ideal: o módulo de processamento (APM) pode continuar ligado. Com a supressão ligada, esse módulo trabalha em banda estreita, perto de 16 kHz, e corta os agudos. É o som de telefone. O Discord não usa esse APM.
2. O padrão do `livekit-client` ainda liga `voiceIsolation: true`. O Radcord não mandava esse campo, então o merge do SDK preenchia com `true`. Quando o navegador aceita o isolamento, ele ignora a supressão que a pessoa desligou. O interruptor da tela não tinha efeito.
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

- Supressão de ruído e ganho automático começam desligados. Preferência salva numa revisão antiga também perde esses dois. Quem ligar de novo, na revisão 2, fica como escolheu. O cancelamento de eco continua ligado: ele não é o corte de agudos, e sem ele a caixa de som volta para o microfone.
- Desligar um processamento manda `{ exact: false }`. Ligar manda `true`.
- `voiceIsolation` vai sempre `{ exact: false }`, na captura e no fallback da sala.
- A captura pede 48 kHz e um canal, como ideal, para um microfone que não tenha essa taxa ainda abrir.
- A faixa do microfone publica com `AudioPresets.musicHighQuality` (96 kbps), `forceStereo: false`, `dtx: false` e `red: true`. O áudio da tela não usa esse preset.
- O destino do portão fica com `channelCount` 1.

A API e o LiveKit do host não entram nessa cadeia. Eles não reamostram a voz.

## Como comparar

Nos dois PCs, reabra o app (`npm run desktop` a partir de `discord/`). A nitidez do microfone não passa pela API. A lista de quem está no canal, que entra na mesma versão, só aparece depois de reiniciar o host.

As duas pessoas entram no mesmo canal de voz, com o microfone que já usavam. A que saía abafada fala. A outra compara com uma call do Discord no mesmo microfone: a voz no Radcord tem que sair nítida, com os agudos de volta, sem mudar o dispositivo.

Em Configurações de voz, supressão e ganho automático aparecem desligados. Ligar a supressão de propósito pode voltar a abafar: é o APM do navegador. O volume e a sensibilidade continuam iguais.
