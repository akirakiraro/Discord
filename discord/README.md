# Radcord

Discord caseiro para jogar com os amigos pela rede do Radmin VPN. Um computador sobe o host. Os outros abrem o app e entram com o IP `26.x` que o host imprime.

O desenho das partes está em [docs/arquitetura.md](docs/arquitetura.md). O botão de se ouvir está em [docs/escuta-propria.md](docs/escuta-propria.md).

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

A API escuta a porta `3000`. O banco fica em `infra/host/data/radcord.db`.

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
