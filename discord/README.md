# SoundRoom

Discord caseiro para jogar com os amigos pela rede do Radmin VPN. Um computador sobe o host. Os outros abrem o app e entram com o IP `26.x` que o host imprime. O nome visível é SoundRoom. Pacotes npm, banco e chaves internas continuam com o nome antigo.

O desenho das partes está em [docs/arquitetura.md](docs/arquitetura.md). Quem está num canal de voz aparece embaixo do canal para todo mundo logado, mesmo sem entrar na call. A voz da call está em [docs/audio-microfone.md](docs/audio-microfone.md). O botão de se ouvir está em [docs/escuta-propria.md](docs/escuta-propria.md).

A versão 0.1.112 junta as três correções: a lista de quem está no canal, a voz nítida do microfone e o botão Me ouvir.

A versão 0.1.113 ajusta mutar e ensurdecer. Surdo deixa o microfone mutado. Clicar em mutar nesse estado volta a ouvir e a falar juntos. Clicar em ensurdecer de novo devolve o mute que estava antes. O que mudou em cada versão está em [docs/changelog.md](docs/changelog.md).

A versão 0.1.116 toca um som quando alguém entra ou sai da call em que você está. Quem já estava na sala não toca de novo. A chave e o volume ficam em Configurações → Voz. O detalhe está em [docs/sons-da-call.md](docs/sons-da-call.md).

A versão 0.1.117 traz a atualização para dentro do app. No programa instalado, a tela de entrar fica bloqueada até baixar a versão nova, com o progresso no canto e um OK para reiniciar. O detalhe está em [docs/atualizacao-do-app.md](docs/atualizacao-do-app.md).

A versão 0.1.118 troca o nome visível para SoundRoom e o ícone. A fonte do ícone é `apps/desktop/build/icon.svg` (quadrado arredondado, gradiente verde-azulado, fone e balão brancos). Quem já instalou o app continua atualizando pelo arquivo `Radcord-Setup-<versão>.exe`, e a sessão continua em `%APPDATA%\Radcord`. O que foi preservado está em [docs/atualizacao-do-app.md](docs/atualizacao-do-app.md) e em [docs/changelog.md](docs/changelog.md).

A versão 0.1.119 instala a atualização sem a janela do NSIS. Depois do OK, a própria tela avisa que o SoundRoom vai fechar e reabrir. O detalhe está em [docs/atualizacao-do-app.md](docs/atualizacao-do-app.md).

## Pré-requisitos

- Node.js com npm.
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
npm run host:firewall
npm run host
```

- `host:install` baixa o `livekit-server.exe` para `infra/host/bin`. Se o arquivo já existe, não baixa de novo.
- `host:firewall` abre as portas só para a faixa `26.0.0.0/8`. Precisa de PowerShell como administrador: API na TCP `3000`, sinalização do LiveKit nas TCP `7880` e `7881`, mídia na UDP `50000–50100`.
- `host` acha o IP do Radmin, sobe o LiveKit preso a esse IP e, em seguida, a API. A janela imprime o endereço que os amigos devem digitar. Fechar essa janela e a do LiveKit desliga o host.

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
