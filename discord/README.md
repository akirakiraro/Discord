# SoundRoom

Discord caseiro para jogar com os amigos pela rede do Radmin VPN. Um computador sobe o host. Os outros abrem o app e entram com o IP `26.x` que o host imprime. O nome visível é SoundRoom. Pacotes npm, banco e chaves internas continuam com o nome antigo.

O desenho das partes está em [docs/arquitetura.md](docs/arquitetura.md). Quem está num canal de voz aparece embaixo do canal para todo mundo logado, mesmo sem entrar na call. A voz da call está em [docs/audio-microfone.md](docs/audio-microfone.md). O botão de se ouvir está em [docs/escuta-propria.md](docs/escuta-propria.md).

A versão 0.1.112 junta as três correções: a lista de quem está no canal, a voz nítida do microfone e o botão Me ouvir.

A versão 0.1.113 ajusta mutar e ensurdecer. Surdo deixa o microfone mutado. Clicar em mutar nesse estado volta a ouvir e a falar juntos. Clicar em ensurdecer de novo devolve o mute que estava antes. O que mudou em cada versão está em [docs/changelog.md](docs/changelog.md).

A versão 0.1.116 toca um som quando alguém entra ou sai da call em que você está. Quem já estava na sala não toca de novo. A chave e o volume ficam em Configurações → Voz. O detalhe está em [docs/sons-da-call.md](docs/sons-da-call.md).

A versão 0.1.117 traz a atualização para dentro do app. No programa instalado, a tela de entrar fica bloqueada até baixar a versão nova, com o progresso no canto e um OK para reiniciar. O detalhe está em [docs/atualizacao-do-app.md](docs/atualizacao-do-app.md).

A versão 0.1.118 troca o nome visível para SoundRoom e o ícone. A fonte do ícone é `apps/desktop/build/icon.svg` (quadrado arredondado, gradiente verde-azulado, fone e balão brancos). Quem já instalou o app continua atualizando pelo arquivo `Radcord-Setup-<versão>.exe`, e a sessão continua em `%APPDATA%\Radcord`. O que foi preservado está em [docs/atualizacao-do-app.md](docs/atualizacao-do-app.md) e em [docs/changelog.md](docs/changelog.md).

A versão 0.1.119 instala a atualização sem a janela do NSIS. Depois do OK, a própria tela avisa que o SoundRoom vai fechar e reabrir. O detalhe está em [docs/atualizacao-do-app.md](docs/atualizacao-do-app.md).

A versão 0.1.120 deixa o microfone cru quando supressão, eco e ganho automático estão desligados. O ganho automático da tela não usa mais o do navegador, que abafava. O slider de volume do microfone passa a alterar o que os outros ouvem: 100% não muda, 400% aumenta. O detalhe está em [docs/audio-microfone.md](docs/audio-microfone.md).

A versão 0.1.121 põe um volume em cada pessoa da call, de 0% a 200%, lembrado neste aparelho. 100% não altera o áudio recebido. O Me ouvir deixa de recapturar o microfone, então ligar a escuta não muda o que os outros ouvem. O detalhe está em [docs/volume-por-pessoa.md](docs/volume-por-pessoa.md) e em [docs/escuta-propria.md](docs/escuta-propria.md).

A versão 0.1.122 mostra, só para o usuário `akira`, um painel com perda, jitter, bitrate, codec e o que o Chromium aplicou no microfone. Serve para medir a call antes de mudar o tratamento da voz. O detalhe está em [docs/diagnostico-audio.md](docs/diagnostico-audio.md).

A versão 0.1.123 completa esse painel: contadores crus do `getStats`, captura original, cadeia do microfone, volume por pessoa, gráfico de 60 s, log e um JSON para copiar ou salvar neste PC. Outra conta continua sem o botão.

A versão 0.1.124 faz o GitHub rodar `npm test` e o typecheck em todo push na `dev`. O instalador continua saindo só do push na `qa`, depois dessa checagem. O Node é o 22.23.4 do `.nvmrc` na raiz do repositório. O detalhe está em [docs/testes.md](docs/testes.md).

A versão 0.1.125 testa o Socket.IO com servidor e cliente de verdade. Sem token a conexão é recusada.

A versão 0.1.126 trava o Me ouvir: abrir e fechar o monitor não pode recapturar o microfone publicado. O detalhe está em [docs/escuta-propria.md](docs/escuta-propria.md).

A versão 0.1.127 aperta os testes de áudio: joelho do limiter, teto de 4×, portão em 0 ou 1, e 100% de volume igual a ganho 1. O detalhe está em [docs/testes.md](docs/testes.md).

A versão 0.1.128 tira da suíte o teste que só repetia outro arquivo. A contagem vai de 448 para 427. O detalhe está em [docs/testes.md](docs/testes.md).

A versão 0.1.129 mede mutação com o Stryker só na máquina local (`npm run test:mutation`) e aperta os testes de áudio, mensagem e sessão. O detalhe está em [docs/testes.md](docs/testes.md).

A versão 0.1.130 liga e desliga o host dentro do app, no PC em que o repositório está clonado. Sem o manifesto o botão não aparece. O passo a passo está em [docs/host-no-app.md](docs/host-no-app.md).

A versão 0.1.131 corrige o "Ligar host neste PC" no Windows: o `--import` do tsx vira `file:///C:/...`. O Node 24 serve. Reabra o `npm run desktop`. Não precisa rodar `host:setup` de novo.

A versão 0.1.132 tira o botão branco. Ligar, firewall, desligar e o resto usam azul, cinza escuro ou vermelho, com texto legível também desabilitado. O detalhe está em [docs/botoes.md](docs/botoes.md).

## Pré-requisitos

- Node.js 22.23.4 no CI (o `.nvmrc` da raiz). `engines` aceita `>=22.23.0`, inclusive o 24 do PC do host. O servidor usa `node:sqlite`, que não carrega no Node 20 nem no 22.12.
- npm.
- Radmin VPN aberto e conectado à mesma rede. O host procura um IP `26.x`.
- Windows na máquina do host. Os scripts `host:*` são PowerShell.

Na pasta `discord/`:

```powershell
npm install
```

## Subir o host

Na pasta `discord/`, nesta ordem:

```powershell
npm run host:install
npm run host:setup
npm run host:firewall
npm run host
```

- `host:install` baixa o `livekit-server.exe` para `infra/host/bin`. Se o arquivo já existe, não baixa de novo. No fim grava o manifesto do módulo.
- `host:setup` grava `infra/host/host-module.json` e uma cópia em `%APPDATA%\Radcord`. É isso que faz o botão aparecer no app. Se o `host:install` acabou de rodar, o manifesto já está lá.
- `host:firewall` abre as portas só para a faixa `26.0.0.0/8`. Precisa de PowerShell como administrador: API na TCP `3000`, sinalização do LiveKit nas TCP `7880` e `7881`, mídia na UDP `50000–50100`. O mesmo botão existe em Configurações → Host e pede o UAC.
- `host` acha o IP do Radmin, sobe o LiveKit preso a esse IP e, em seguida, a API. A janela imprime o endereço que os amigos devem digitar. Fechar essa janela e a do LiveKit desliga o host. Com o app aberto no mesmo PC, esse host aparece como "Ligado fora do app": o app não mata o processo do terminal.

No app, depois do `host:setup` e com o Radmin conectado, a tela de entrar tem "Ligar host neste PC". Isso sobe o LiveKit e a API sem o terminal e preenche o IP. Desligar fica em Configurações → Host, hoje só para o usuário `akira`.

A API escuta a porta `3000`. O banco fica em `infra/host/data/radcord.db`. O arquivo não muda de nome: um banco novo perderia as contas.

## Desktop

Em desenvolvimento, no mesmo PC ou em outro da rede:

```powershell
npm run desktop
```

No login, digite o IP `26.x` que o host mostrou.

Compilar o instalador Windows (NSIS em `apps/desktop/release`):

```powershell
npm run desktop:dist
```

Publicar essa versão na pasta que o host serve em `/updates`:

```powershell
npm run desktop:publish
```

Esse comando gera o instalador e copia `latest.yml`, o Setup e o `.blockmap` para `infra/host/updates`. O host precisa estar no ar para os apps buscarem a atualização.
