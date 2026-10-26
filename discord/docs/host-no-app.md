# Host dentro do app

O que a versão **0.1.132** faz no PC que sobe o SoundRoom para a galera. O áudio da call não muda. O instalador NSIS continua levando só o app, o `RadcordLoopback.exe` e o ícone. O "módulo de host" é o repositório clonado, não um pacote dentro do instalador.

## O que tem que continuar verdade

- Sem um manifesto válido, a opção não aparece. Não existe uma tela de "indisponível".
- O manifesto é `infra/host/host-module.json`, versão `1`, com caminhos absolutos do LiveKit, da entrada do server, do `node`, do `tsx` e do script de firewall. `npm run host:setup` grava esse arquivo. `npm run host:install` grava o mesmo depois de baixar o `livekit-server.exe`.
- O app aceita o módulo só se o JSON for válido e os dois arquivos existirem: `livekit-server.exe` e `apps/server/src/index.ts`. Ele procura, nesta ordem, a variável `RADCORD_HOST_MODULE`, `%APPDATA%\Radcord\host-module.json` e `infra/host/host-module.json` subindo a partir da pasta do app e da pasta em que o processo foi aberto. O `host:setup` também copia o manifesto para `%APPDATA%\Radcord`, que é onde o app instalado acha.
- Na tela de entrar, o botão "Ligar host neste PC" aparece para quem tem o módulo, mesmo sem login. Ao ficar ligado, o IP `26.x` deste PC entra no campo do host.
- Em Configurações → Host a seção exige o módulo e, por enquanto, o username `akira` sem diferenciar maiúsculas. A trava é a constante `HOST_SETTINGS_REQUIRE_AKIRA` em `apps/desktop/src/shared/hostGate.ts`. Para qualquer pessoa com o módulo poder ser host, mude essa constante para `false`. Não há outra lista de usuários.
- Quem liga e desliga é o processo principal do Electron. O renderer só pede pelos canais `radcord:host-*` do preload (`contextBridge`). O canal de desligar ignora o pedido se `confirmed` não for `true`.
- A subida não usa `npm run` nem um shell. O LiveKit é o `livekit-server.exe --config <livekit.yaml>`. A API é `node --import <file URL do tsx> <entrada do server>`, com pasta de trabalho `apps/server`, `BIND_HOST` no IP do Radmin, banco em `infra/host/data/radcord.db`, chave `radcord` e URL `ws://IP:7880`. O manifesto guarda caminhos normais, inclusive `C:\Program Files\nodejs\node.exe`. Na hora de montar o `--import`, o app converte o loader com `pathToFileURL` (`file:///C:/...`, espaço vira `%20`). A entrada do server, o `node.exe`, o banco e o `livekit.yaml` continuam caminhos: cada um é um argumento só, então espaço no caminho não quebra. Um `C:\` cru no `--import` vira protocolo `c:` e o Node encerra com `ERR_UNSUPPORTED_ESM_URL_SCHEME`. Quem já tem o `host-module.json` não roda `host:setup` de novo por esta correção. Basta reabrir o `npm run desktop`.
- O Node do PC pode ser o 22.23 ou mais novo, inclusive o 24. O `.nvmrc` continua `22.23.4` para o CI. `engines` é `>=22.23.0` e não bloqueia o 24.
- Desligar mata a árvore com `taskkill /PID <pid> /T /F` no Windows. O estado só volta a "Desligado" quando as portas 3000 e 7880 deixam de aceitar conexão.
- "Ligado" exige os dois: `GET /health` com `status: ok` e a porta 7880 aceitando TCP. O prazo é 20 s (`HOST_START_TIMEOUT_MS`). Se passar, a árvore morre e a frase diz que o host não respondeu.
- "Ligado fora do app" é o host que já respondia antes deste processo subir (o terminal). O app não oferece desligar. A frase pede para fechar aquela janela.
- `/health` também devolve `online` (pessoas, não janelas) e `inVoice` (assentos do canal). O botão Desligar sempre pede confirmação com esses números: "Desligar derruba a call de todos." Fechar o app com o host que ele mesmo ligou desliga o host. Se `online` ou `inVoice` for maior que zero, a janela pede confirmação antes. Sem ninguém, desliga e fecha.
- Enquanto esse host (o que o app ligou) está iniciando, ligado ou desligando, a atualização pronta não chama `quitAndInstall`. A fase fica `deferred`, o login não trava, e o canto mostra "Instalar depois de desligar o host". Quando o host desliga, a fase volta a `ready` e o OK de sempre instala. Host aberto no terminal não adia a atualização. O detalhe da instalação em si continua em [atualizacao-do-app.md](atualizacao-do-app.md).
- O botão "Liberar portas no firewall" roda `open-firewall.ps1` elevado (`Start-Process -Verb RunAs`). O app não cria regra sozinho. Se as três regras do grupo SoundRoom já existem, a frase é "Firewall ok". Cancelar o UAC (código 1223) deixa a frase de cancelamento. "Verificar firewall" e "Liberar portas" são o botão secundário (cinza escuro, texto claro). Ligar é azul. Desligar é vermelho. Nenhum deles usa o fundo branco do sistema. O padrão está em [botoes.md](botoes.md).
- Logs da API e do LiveKit ficam em `infra/host/logs`. Ao passar de 1 MB o arquivo vira `.1` e um novo começa. A tela mostra as últimas 40 linhas de cada um.

Erros que a tela mostra, com o texto do código:

- Radmin sem IP `26.x`.
- Porta 3000 ou 7880 ocupada.
- Falta o Node, o tsx ou o LiveKit (`npm run host:install`).
- O host não respondeu em 20 s, ou o processo saiu com um código. Nesse caso a frase inclui a causa em português (caminho `file:///` no Windows, porta ocupada, módulo faltando, Node anterior a 22.23) e a linha `Error` do log. O Node 24.15.0 não é tratado como antigo.
- As portas continuaram ocupadas depois do `taskkill`.

Exemplo, na pasta `discord/` de um Windows com o Radmin conectado:

```powershell
npm install
npm run host:install
npm run host:setup
npm run desktop
```

Na tela de entrar, "Ligar host neste PC". O campo passa a mostrar o `26.x`. Os amigos usam esse IP. Para desligar, entre com `akira`, abra Configurações → Host e confirme. O firewall, uma vez, pode ser o botão dessa seção ou `npm run host:firewall` num PowerShell de administrador.

## Onde está

| Peça | Onde |
| --- | --- |
| Manifesto | `scripts/write-host-module.mjs` |
| Quem vê a seção | `apps/desktop/src/shared/hostGate.ts` |
| Estados e IPC | `apps/desktop/src/main/host/` |
| Tela de entrar e Configurações | `HostLaunchControl.tsx`, `HostSettings.tsx` |
| Atualização adiada | `apps/desktop/src/main/desktopUpdate.ts`, fase `deferred` |
| Contagem no `/health` | `apps/server/src/app.ts` |

O `npm run host` do terminal continua igual. Se ele já estiver no ar, o app só avisa.
