# Áudio da tela

Referência do que o desktop captura quando alguém compartilha uma janela ou uma tela, e do que já foi tentado. O código que vale é o da versão **0.1.94** em diante. Se o som estalar ou sumir, comece pela seção [Como ler o log](#como-ler-o-log) e não repita o que está em [O que não fazer](#o-que-não-fazer).

## O que tem que continuar verdade

- O áudio é o do processo da janela escolhida, ou dos processos visíveis na tela escolhida. Não é o loopback do sistema inteiro.
- Quem compartilha se ouve. O monitor local fica ligado.
- O slider "Som da tela" muda só o volume de quem está ouvindo, inclusive de quem compartilha. Não muda os bytes enviados aos outros.
- Surdez força o volume de escuta para 0. O envio continua.
- O estalo da largada não se resolve apagando o começo do áudio.

## Caminho do áudio

1. O pedido de tela do Chromium sai com `audio: false`. O `setDisplayMediaRequestHandler` devolve só o vídeo. O Electron não oferece áudio por janela: o campo `audio` do handler só aceita `loopback`, `loopbackWithMute` ou um frame. A proposta `audio: 'application'` (Electron #54628) segue aberta.
2. O helper `RadcordLoopback.exe` captura o processo no Windows. É .NET 8, `win-x64`, single-file dependente do runtime. O fonte está em `apps/desktop/native/loopback/Program.cs`. O binário que o app usa está em `apps/desktop/resources/loopback/RadcordLoopback.exe`.
3. O processo principal mistura os PCM e manda o frame de 20 ms (3840 bytes, s16le estéreo 48 kHz) por `radcord:screen-audio-pcm`.
4. O renderer publica isso no LiveKit como `ScreenShareAudio`, num único `AudioContext` compartilhado, na taxa da placa. Criar um contexto novo a 48 kHz a cada compartilhamento reinicia a placa e estala o áudio inteiro, voz incluída.
5. Quem compartilha ouve a própria faixa num `<audio>` (`LocalScreenAudio`), no volume do slider. Quem recebe ouve pelo `AudioTrack` do LiveKit, no mesmo volume.

Arquivos:

| Peça | Onde |
| --- | --- |
| Helper WASAPI | `apps/desktop/native/loopback/Program.cs` |
| Processos, mix e IPC | `apps/desktop/src/main/screenAudioCapture.ts` |
| Quais PIDs entram | `apps/desktop/src/shared/screenAudioTargets.ts` |
| Fonte escolhida | `apps/desktop/src/main/screenShareSources.ts` |
| Sem loopback do Chromium | `apps/desktop/src/main/mediaPermissions.ts` |
| Publicar e parar | `apps/desktop/src/renderer/src/lib/voice/filteredScreenAudio.ts` |
| PCM para faixa LiveKit | `apps/desktop/src/renderer/src/lib/voice/screenAudioPump.ts` |
| Slider e monitor local | `apps/desktop/src/renderer/src/components/voice/` |
| Log | `apps/desktop/src/main/screenAudioLog.ts` |

## Qual processo entra

O id de janela do Windows é `window:<HWND>:<flag>`. O flag é 1 para o processo atual e 0 para os outros. Não é o PID. O HWND vai para `GetWindowThreadProcessId`. O PID do próprio Electron fica de fora.

Tela inteira (`screen:<id>:0`): janelas visíveis cujo retângulo cruza o monitor, PIDs únicos, sem o PID do Electron, no máximo 8. O mix é a média das amostras s16, para não clipar na soma.

O modo do loopback é `PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE`: o processo e os filhos. No Chrome, o HWND costuma ser o processo do navegador, e o áudio da aba entra na árvore.

## Como o helper abre a captura

`ActivateAudioInterfaceAsync` em `VAD\Process_Loopback`, com um blob `VT_BLOB` (`0x41`) de `AUDIOCLIENT_ACTIVATION_PARAMS`.

O callback COM tem que ser um marshaler free-threaded (`IAgileObject` `94ea2b94-e9cc-49e0-c0ff-ee64ca8f5b90` mais `IMarshal` encaminhado ao FTM). Sem isso a ativação devolve `0x8000000E`. Handler nulo devolve `0x80070057`. O wrapper gerado por `StrategyBasedComWrappers` não serve de handler; a vtable é manual.

`GetMixFormat` e `IsFormatSupported` não existem nesse cliente: HRESULT `0x80004001` (`E_NOTIMPL`). A interface gerada do .NET transforma esse código em `NotImplementedException` e mata o processo. Por isso o helper chama `GetMixFormat` pela vtable (slot 8) só para registrar o código, e não usa o ponteiro. A linha `mix ausente: 0x80004001` no log é o caminho normal, não uma falha.

O formato que o motor já produz, e que o `Initialize` aceita com `hr=0x00000000`, é float 32 bits, 2 canais, 48 kHz (`WAVE_FORMAT_IEEE_FLOAT`, tag 3). Flags: `AUDCLNT_STREAMFLAGS_LOOPBACK` (`0x00020000`) e `AUDCLNT_STREAMFLAGS_EVENTCALLBACK` (`0x00040000`). Sem `AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM` (`0x80000000`). A duração do buffer fica 0, que é o exigido no modo com evento.

A conversão para s16 estéreo é feita no helper: `clamp(round(amostra * 32767), -32768, 32767)`. O pump do renderer assume 48 kHz. Não dá para trocar a taxa sem mudar o pump.

O evento sozinho não basta. O loop espera no máximo 10 ms e lê o buffer mesmo se o evento não disparar. `GetBuffer` é copiado e `ReleaseBuffer` acontece antes de escrever no stdout. Segurar o pacote WASAPI durante um write bloqueado prende o motor.

Pacote com `AUDCLNT_BUFFERFLAGS_DATA_DISCONTINUITY` (flag 1) vira silêncio e gera uma linha `discontinuity` no stderr. O estalo da largada não vinha com essa flag.

## Por que estalava

Pedir PCM 16 bits com `AUTOCONVERTPCM` faz o Windows inserir um conversor, porque o loopback do processo nasce em float. Nos primeiros pacotes esse conversor solta amostras grudadas no máximo (`32768`, que é o s16 `-32768`) no meio de silêncio, sem marcar descontinuidade. No log de 22/10/2026 14:10 o primeiro segundo teve pico 32768 e um buraco de 290 ms; o segundo seguinte já era silêncio. Às 14:28 o helper contou dezenas dessas amostras por pacote (50, 71, 59, 75…) e o resto do pacote era silêncio. Não é o áudio do Chrome.

Zerar `|amostra| >= 32000` no primeiro segundo (0.1.92) tirou o estalo e também o começo do som. Foi rejeitado: escondia o problema. Desligar o monitor de quem compartilha (0.1.86) também foi rejeitado.

A captura em float nativo, medida antes de publicar a 0.1.93, saiu com pico 0 no primeiro segundo e nenhuma amostra no máximo. O teste de 14:34 confirmou: `init path=float hr=0x00000000` e, em seguida, picos de 1450, 1860 e 951.

## Por que o som sumia na tentativa seguinte

Na 0.1.93 a primeira captura do Chrome fluía (~192 KB/s). A segunda e a terceira entregavam um pacote de cerca de 0,45 s (84480 ou 92160 bytes) e o `lastAt` do medidor congelava. O processo do helper continuava vivo, sem exceção. O evento deixava de disparar.

Tirar o `EVENTCALLBACK` e só fazer poll não resolve. Nesse modo o motor entrega os mesmos ~480 ms e para, mesmo com um tom tocando. O loopback por processo precisa da flag de evento para continuar produzindo. O poll de 10 ms existe para não perder o pacote quando o evento falha, não para substituir a flag.

O outro agravante era encerrar o helper com `TerminateProcess` sem `IAudioClient.Stop`. O motor ficava com o cliente morto e a ativação seguinte só devolvia o pré-roll.

Na 0.1.94, parar o compartilhamento fecha o stdin do helper. Ele chama `Stop`, solta os wrappers `UniqueInstance` e força o GC antes de sair. O processo principal espera essa saída e só então mata, se passar de 400 ms. A próxima captura só começa depois disso.

Prova local, com um tom de 440 Hz e amplitude 12000, duas capturas seguidas: as duas ouviram o tom, pico 11997, cerca de 1,4 a 1,6 s de áudio numa janela de 2 s. O teste do usuário em 14:47–14:48 repetiu o resultado em quatro compartilhamentos, todos com `capture_exit` código 0 e sem pico 32768.

## Como ler o log

A gravação está desligada desde a 0.1.96: `screenAudioLog` não escreve arquivo nem console. Os eventos continuam chamando a função, então religar é voltar a gravar a linha JSON nesse ponto. Quando estava ligado, o arquivo era `apps/desktop/screen-audio.log` (e uma cópia em `%userData%/screen-audio.log`), no `.gitignore` por `*.log`. Uma linha JSON por evento. O pico do medidor era o máximo daquele segundo e voltava a zero no intervalo.

Captura saudável de uma janela:

- `init path=float hr=0x00000000`
- `mix ausente: 0x80004001`
- cerca de 192000 bytes a mais por segundo (48000 × 4)
- pico na casa de centenas ou milhares enquanto o app toca, e 0 quando ele está em silêncio
- buraco inicial de 200 a 280 ms; depois, buracos de cerca de 11 a 30 ms
- `capture_exit` com `code: 0`

Tela inteira soma um fluxo por PID. Quatro processos dão cerca de 768000 bytes por segundo. O log de 14:48 com Explorer, Chrome, Cursor e ApplicationFrameHost foi isso.

| Sintoma no log | O que é |
| --- | --- |
| Pico 32768 no primeiro segundo, sem `discontinuity` | Voltou o conversor. Alguém pediu PCM 16 bits com `AUTOCONVERTPCM`. |
| `NotImplementedException` em `GetMixFormat` e daí `bytes: 0` | A interface gerada lançou `E_NOTIMPL`. Não chamar `GetMixFormat` por ela. |
| Bytes congelados perto de 80–96 KB e `lastAt` parado | A captura parou depois do pré-roll. Ver se a flag de evento sumiu ou se o cliente anterior não recebeu `Stop`. |
| Pico 0 com bytes subindo a 192 KB/s | O processo alvo está em silêncio. A captura está viva. |
| `capture_exit` ausente ou código diferente de 0 | O helper morreu ou ficou preso. O stderr da mesma captura diz o HRESULT. |

## Publicar o helper e reiniciar

```
dotnet publish -c Release -o out --nologo -v q
```

na pasta `apps/desktop/native/loopback`, e copiar `out\RadcordLoopback.exe` para `apps/desktop/resources\loopback\`. O `out/`, `bin/` e `obj/` não entram no git. O exe em `resources/loopback` entra.

Mudança no helper, no processo principal ou no preload só vale depois de reiniciar o desktop (`npm run desktop` a partir de `discord/`). Não derrube o host da API só para isso. Se `npm run host` disser `EADDRINUSE` em `:3000`, o servidor antigo ainda está escutando.

## O que não fazer

- Não voltar ao loopback do sistema (`audio: 'loopback'`) para "ouvir a tela". Isso mistura tudo o que a máquina toca.
- Não desligar `LocalScreenAudio` nem aplicar o slider no ganho da faixa publicada.
- Não descartar os primeiros milissegundos nem zerar amostras altas para esconder o estalo.
- Não inicializar com PCM 16 bits e `AUTOCONVERTPCM` enquanto o float nativo for aceito.
- Não tirar `AUDCLNT_STREAMFLAGS_EVENTCALLBACK`. Sem ela o motor para no primeiro meio segundo.
- Não depender só do evento. O loop tem que ler o buffer no timeout de 10 ms.
- Não matar o helper como primeiro gesto. Feche o stdin, espere o `Stop`, e só então use o kill de reserva.
