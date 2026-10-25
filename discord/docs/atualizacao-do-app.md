# Atualização do app

O que o SoundRoom instalado faz quando existe uma release mais nova no GitHub. A checagem que vale é a da versão **0.1.117**. O nome e o ícone são da **0.1.118**. A instalação silenciosa é da **0.1.119**. O `npm run desktop` não entra nisso: o app de desenvolvimento não está empacotado, a checagem é pulada e o login abre normal.

## O que tem que continuar verdade

- A checagem da abertura roda uma vez, no processo principal, antes da tela de entrar.
- Enquanto a versão instalada não está em dia, a tela de login não aparece. No lugar fica "Atualizando o SoundRoom...", no mesmo cartão escuro da entrada. Até a 0.1.117 esse texto dizia Radcord.
- O canto inferior direito mostra a fase: verificando, baixando, pronto para instalar, instalando, ou o erro. Na baixa, a barra traz a porcentagem e, se o updater mandar, a velocidade e o tamanho. Na instalação a barra não tem número: o NSIS não informa a troca dos arquivos.
- Não há janela nativa de confirmação. O download começa sozinho. Quando termina, um modal do próprio app diz que precisa reiniciar e tem um botão OK.
- OK não fecha na hora. A fase passa a `installing`. A tela no lugar do login e o cartão do canto dizem que o SoundRoom vai fechar e reabrir sozinho. A pausa é `INSTALL_PAUSE_MS` (1500 ms), para a frase ser lida. Aí o processo chama `quitAndInstall(true, true)`.
- No electron-updater 6.8.9, `quitAndInstall(isSilent, isForceRunAfter)` só repassa o segundo argumento quando `isSilent` é true. Com false, o 6.8 troca esse argumento por `autoRunAppAfterInstall`. Por isso a chamada antiga `quitAndInstall(false, true)` abria a janela do NSIS: o segundo true não ia para a linha de comando. `autoRunAppAfterInstall` continua true, mas nesse caminho silencioso ele não entra.
- `NsisUpdater.doInstall` monta `--updated /S --force-run`. No oneClick do electron-builder 26.15, o SpiderBanner ("Instalando, por favor aguarde...") só é desenhado dentro de `IfNot Silent`. Com `/S` essa janela não abre. `RUN_AFTER_FINISH` fica definido porque `runAfterFinish` não é false. A seção então chama `doStartApp` quando não é silencioso ou quando `--force-run` está na linha. Silencioso e reabrir funcionam juntos.
- `customInstall` do `build/installer.nsh` é inserido na mesma seção, depois dos arquivos e fora do `IfNot Silent`. O atalho da área de trabalho que faltar e a remoção de `Radcord.lnk` continuam no silencioso.
- Sem internet, com o GitHub fora ou no limite da API, a tela continua bloqueada. A mensagem fica em português e o botão é "Tentar novamente". Falha no meio do download faz o mesmo. A falha não libera o login.
- O host não baixa o instalador. A cada 2 minutos ele lê a release pública mais nova. O intervalo é `RELEASE_POLL_MS` (inteiro entre 10000 e 3600000; o padrão é 120000). A consulta é `GET https://api.github.com/repos/akirakiraro/Discord/releases/latest`, sem token, com `User-Agent: radcord-host` e prazo de 8 segundos.
- Limite, timeout, HTTP ruim ou tag que não é `0.1.N` não derrubam o host. A última tag boa continua valendo.
- Quando a tag sobe (semver, então `0.1.10` é maior que `0.1.9`), o socket emite `app:release` com `{ version }` para todo mundo logado. Quem conecta depois recebe a mesma versão na hora, para não perder o aviso se entrou no meio.
- O app compara com `app.getVersion()`. Versão igual ou menor não dispara download. Maior dispara a mesma checagem, o mesmo cartão e o mesmo OK, esteja a pessoa na call ou não.
- Quem está na tela de entrar ainda não tem socket. Essa tela depende da checagem da abertura. O aviso ao vivo chega para quem tem sessão, inclusive no instante em que a sessão conecta.
- O download continua em blocos: o `electron-updater` usa o `.blockmap` publicado junto com o Setup.

Um app já instalado numa versão anterior a esta não tem esta tela. Ele atualiza uma vez pelo diálogo nativo antigo. A tela nova passa a valer no próximo release, já com este código.

## Onde está

| Peça | Onde |
| --- | --- |
| Máquina de estados | `apps/desktop/src/main/desktopUpdate.ts` |
| Fases e o que bloqueia o login | `apps/desktop/src/shared/desktopUpdateSnapshot.ts` |
| Feed, IPC e eventos do updater | `apps/desktop/src/main/index.ts` |
| Preload | `apps/desktop/src/preload/index.ts` |
| Tela, cartão e modal | `apps/desktop/src/renderer/src/components/update/` |
| Textos e a barra | `apps/desktop/src/renderer/src/lib/update/updateView.ts` |
| Contrato `0.1.N` e `app:release` | `packages/shared/src/releaseContract.ts` |
| Poller do host | `apps/server/src/updates/releasePoller.ts` |
| Aviso ao conectar | `apps/server/src/realtime/realtimeGateway.ts` |

O workflow `.github/workflows/qa-desktop.yml` publica, a cada push na `qa`, a tag `v0.1.<run_number>` com `Radcord-Setup-<versao>.exe`, o `.blockmap` e o `latest.yml`. O `artifactName` do NSIS é esse mesmo nome, então o `path` do `latest.yml` e o arquivo da release coincidem. O título da release é `SoundRoom` mais a versão. A tag não muda. O host e o `electron-updater` leem a tag e o `latest.yml`, não o título.

## Nome, ícone e o que a atualização não pode perder

Na 0.1.118 o `productName` passou a SoundRoom. O ícone novo está em `apps/desktop/build/`: `icon.svg` é a fonte, `icon.png` tem 1024 px, `icon-512.png` tem 512 px, e `icon.ico` traz 256, 128, 64, 48, 32 e 16 px. O canto transparente do quadrado arredondado fica sem fundo. A janela, o instalador e a barra de tarefas usam esses arquivos. O desenho da barra da janela continua em `src/renderer/public/window-icon.png`.

O que ficou de propósito:

- `appId` continua `dev.radcord.desktop`. O NSIS oneClick grava a pasta de instalação no registro dessa chave e, na atualização, instala de novo nela. Uma instalação nova, por usuário, usa o nome do pacote sanitizado (`@radcorddesktop` em `%LOCALAPPDATA%\Programs`), não o `productName`. Esse caminho também não muda.
- O arquivo publicado continua `Radcord-Setup-<versão>.exe`. Se o nome seguisse o `productName`, o `latest.yml` passaria a citar `SoundRoom-Setup-...` e o workflow, se ainda copiasse o nome antigo, publicaria um arquivo que o updater não acha. O `artifactName` trava o nome antigo. O workflow recusa a release se o `latest.yml` não citar esse arquivo.
- O executável dentro da pasta passa de `Radcord.exe` para `SoundRoom.exe`, porque o nome do exe acompanha o `productName`. O desinstalador da versão anterior, chamado com `--updated`, tira o exe antigo. O atalho novo se chama SoundRoom. `build/installer.nsh` cria o atalho da área de trabalho se a atualização não criou, e apaga `Radcord.lnk` quando o nome novo é outro.
- A sessão fica em `%APPDATA%\Radcord`. O Electron usaria o `productName` e abriria `%APPDATA%\SoundRoom`, vazia. O processo principal chama `app.setPath('userData', ...)` antes do `ready`, apontando para a pasta antiga. Login, microfone e posição da janela continuam lá. As chaves `radcord.login` e `radcord.mic` não foram renomeadas.
- Não mudam: escopo `@radcord/*`, `RadcordLoopback.exe`, `radcord.db`, a chave LiveKit `radcord`, o `User-Agent` `radcord-host`, o dono e o repositório do publish (`akirakiraro/Discord`).

O instalador real não foi executado daqui. O que dá para ver é o `artifactName`, o `appId`, o caminho do `userData` e o contrato do `latest.yml`.

## Se a janela do NSIS ainda aparecer

A barra verde não cabe dentro do app: o instalador precisa que o SoundRoom feche para trocar `SoundRoom.exe`. O caminho normal, a partir da 0.1.119, é o `/S`. A janela ainda pode aparecer na primeira instalação (a pessoa abre o Setup na mão) ou se o silencioso não pegar.

O que foi marcado sem mexer no que a atualização já conhece:

- `installerIcon` e `installerHeaderIcon` apontam para `icon.ico` em `apps/desktop/build`. No oneClick, o segundo é o ícone acima da barra. O `win.icon` continua `build/icon.ico`.
- `customInit` no `installer.nsh` põe `$LANGUAGE` em `LANG_PORTUGUESEBR` antes das páginas. O título fica "Instalação do SoundRoom" (é o caption do idioma PortugueseBR do NSIS) e o banner usa o texto pt_BR que o electron-builder já traz: "Instalando, por favor aguarde...".
- Se a janela estiver na tela, `brandVisibleInstaller` troca a frase do controle 1000 para "Instalando o SoundRoom. Ele abre sozinho em seguida." No `/S` o banner não existe, o `FindWindow` não acha o controle e a macro não faz mais nada. Ela roda depois da remoção do `Radcord.lnk`.
- Não há um segundo `LangString installing`. O makensis do electron-builder trata aviso como erro. Redefinir a string derrubaria o `qa-desktop.yml`.

Não mudam, de propósito: `appId` `dev.radcord.desktop`, o arquivo `Radcord-Setup-<versão>.exe`, a pasta `%APPDATA%\Radcord`, `oneClick: true` e o `perMachine: false`.

## Host

Reinicie o host para o poller existir. Sem isso o app instalado ainda se atualiza na abertura, mas ninguém recebe `app:release` no meio da sessão.

A primeira consulta sai assim que o processo sobe. As seguintes esperam o intervalo. O timer não segura o processo aberto sozinho. No padrão são 30 consultas por hora, abaixo do limite anônimo do GitHub. Um intervalo curto demais passa a receber HTTP 403: o host continua no ar e não anuncia até a consulta voltar.

## O que este ambiente não prova

O instalador NSIS e a reabertura só acontecem num Windows com o app empacotado, numa versão anterior à release que está no GitHub. Daqui dá para ver a máquina de estados, o contrato, o poller e o que o electron-updater 6.8.9 e o template NSIS do electron-builder 26.15 fazem com `/S` e `--force-run`. Não dá para ver o Setup trocar o executável, a janela do NSIS sumir e o SoundRoom voltar.
