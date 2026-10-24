# Changelog

## 0.1.113

Mutar e ensurdecer passam a seguir uma máquina só.

- Mutar alterna o microfone e fica assim até o próximo clique.
- Ensurdecer cala o microfone e o áudio recebido (as outras pessoas e o áudio de tela) ao mesmo tempo, e guarda o mute de antes.
- Surdo implica microfone mutado. O LiveKit deixa de publicar. O Me ouvir para e o portão não reabre a captura.
- O botão de mutar não trava. Clicar nele enquanto surdo desmuta o microfone e o áudio juntos.
- Clicar em ensurdecer de novo devolve o mute guardado: se já estava mutado, continua mutado.

## 0.1.112

Junta a lista de quem está no canal sem entrar na call, a voz nítida do microfone (48 kHz mono, 96 kbps, processamento com `{ exact: false }`) e o Me ouvir que solta o portão antes de reabrir o microfone.
