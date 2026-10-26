# Botões

O que a versão **0.1.132** exige em todo botão do app. Vale no descanso, no hover, no foco, desabilitado e enquanto carrega (o carregando usa `disabled`).

Nenhum botão fica com o fundo branco ou cinza claríssimo do sistema, nem com texto branco em cima de fundo claro. O contraste entre fundo e texto é de pelo menos 4,5:1.

## Variantes

O componente é `Button` em `apps/desktop/src/renderer/src/components/ui/Button.tsx`. O CSS fica em `styles/buttons.css`, carregado por último para ganhar de regra antiga.

| Variante | Uso | Fundo | Texto |
| --- | --- | --- | --- |
| `primary` | ação principal (Ligar host, Entrar) | azul `#5865f2` | branco |
| `secondary` | ação comum (firewall, Cancelar) | cinza escuro `#2b2d31` | `#f2f3f5` |
| `danger` | desligar, sair, apagar a sessão | vermelho `#c43135` | branco |
| `success` | entrar na call, Me ouvir ligado | verde `#23a55a` | quase preto `#1e1f22` |
| `ghost` | ação sobre superfície escura, sem bloco | transparente | `#f2f3f5` |

Desabilitado escurece o fundo e mantém texto legível. Não usa opacidade no botão inteiro e não volta para o cinza do Windows.

Exemplo:

```tsx
<Button variant="primary" onClick={onStart}>Ligar host</Button>
<Button variant="secondary" onClick={onCheckFirewall}>Verificar firewall</Button>
<Button variant="danger" onClick={onAskStop}>Desligar host</Button>
```

Botão de ícone, canal, membro e a barra redonda da call não passam por esse componente. Cada um tem a própria classe do tema (`icon-button`, `round-button`, `channel-item`, e as outras em `THEME_BUTTON_CLASSES`). Essa classe declara fundo e texto. `className="button"` sozinho não serve: foi isso que deixou "Verificar firewall" com fundo `#f0f0f0` e letra branca.

## O que o teste barra

`apps/desktop/src/renderer/src/components/ui/buttonTheme.test.ts` falha se:

- um par das variantes fica abaixo de 4,5:1
- o CSS de um botão pinta fundo claro, texto branco sem fundo escuro, ou opacidade entre 0 e 1
- um `<button>` do renderer não tem classe do tema

Reabra o `npm run desktop` para ver a correção. O áudio não muda.
