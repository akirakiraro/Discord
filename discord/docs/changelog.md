# Changelog

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
