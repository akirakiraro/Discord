# Atualização do app

O que o Radcord instalado faz quando existe uma release mais nova no GitHub. O código que vale é o da versão **0.1.117**. O `npm run desktop` não entra nisso: o app de desenvolvimento não está empacotado, a checagem é pulada e o login abre normal.

## O que tem que continuar verdade

- A checagem da abertura roda uma vez, no processo principal, antes da tela de entrar.
- Enquanto a versão instalada não está em dia, a tela de login não aparece. No lugar fica "Atualizando o Radcord...", no mesmo cartão escuro da entrada.
- O canto inferior direito mostra a fase: verificando, baixando, pronto para instalar, ou o erro. Na baixa, a barra traz a porcentagem e, se o updater mandar, a velocidade e o tamanho.
- Não há janela nativa de confirmação. O download começa sozinho. Quando termina, um modal do próprio app diz que precisa reiniciar e tem um botão OK.
- OK chama `quitAndInstall(false, true)` com `autoRunAppAfterInstall` ligado. No electron-updater 6.8 o segundo argumento é ignorado quando a instalação não é silenciosa; a flag ligada é o que coloca `--force-run` na linha do NSIS. O instalador oneClick, com isso, abre o Radcord de novo.
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

O workflow `.github/workflows/qa-desktop.yml` não muda. Ele continua publicando, a cada push na `qa`, a tag `v0.1.<run_number>` com `Radcord-Setup-<versao>.exe`, o `.blockmap` e o `latest.yml`.

## Host

Reinicie o host para o poller existir. Sem isso o app instalado ainda se atualiza na abertura, mas ninguém recebe `app:release` no meio da sessão.

A primeira consulta sai assim que o processo sobe. As seguintes esperam o intervalo. O timer não segura o processo aberto sozinho. No padrão são 30 consultas por hora, abaixo do limite anônimo do GitHub. Um intervalo curto demais passa a receber HTTP 403: o host continua no ar e não anuncia até a consulta voltar.

## O que este ambiente não prova

O instalador NSIS e a reabertura só acontecem num Windows com o app empacotado, numa versão anterior à release que está no GitHub. Daqui dá para ver a máquina de estados, o contrato e o poller. Não dá para ver o Setup trocar o executável e a janela voltar.
