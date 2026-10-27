# Minimizar na bandeja

O que o SoundRoom faz quando alguém clica no X da janela. O código que vale é o da versão **0.1.134**. O áudio da call não muda.

## O que tem que continuar verdade

- O X esconde a janela em vez de fechar o app. O SoundRoom continua rodando, a call segue ativa e o ícone fica na bandeja do Windows.
- O aviso aparece só na primeira vez que o X esconde o app, e nunca mais depois. O arquivo `tray-notice-seen` em `%APPDATA%\Radcord` guarda isso; apagar o arquivo faz o aviso voltar uma vez. Dali em diante o X esconde em silêncio.
- Esse aviso é: "O SoundRoom continua aberto". O texto diz que ele foi minimizado para a bandeja e que o Sair fecha de vez. No Windows é o balão da bandeja (`Tray.displayBalloon`); nos outros sistemas, uma notificação.
- Clicar no ícone da bandeja, ou em "Abrir o SoundRoom" no menu, traz a janela de volta, no mesmo lugar e tamanho.
- "Sair do SoundRoom", no menu do ícone, fecha de verdade.
- Atualização instalada pelo app e desligar o Windows também saem de verdade. Todo `app.quit()` liga o pedido de saída (`before-quit`) e `session-end` faz o mesmo.
- Se o ícone da bandeja não puder ser criado (arquivo do ícone faltando ou vazio), o X fecha o app como antes. Esconder sem ícone deixaria o app invisível e sem como reabrir.
- Esconder não mexe no host. O host que o app ligou continua no ar até a saída de verdade.
- Na saída de verdade, tudo continua como em [host-no-app.md](host-no-app.md): com o host do app ligado, "Sair" pede a confirmação com quantas pessoas estão online e na call. Se a pessoa cancelar, a saída é desfeita e o próximo X volta a esconder.
- `npm run desktop` também esconde na bandeja. Fechar de verdade é pelo menu do ícone.

## Onde está

| Peça | Onde |
| --- | --- |
| Regra do X e textos | `apps/desktop/src/main/closeToTray.ts` |
| Ícone, menu, aviso e ligação com a janela | `apps/desktop/src/main/appTray.ts` |
| Ordem dos ouvintes de `close` | `apps/desktop/src/main/index.ts` |
| Confirmação do host só na saída de verdade | `apps/desktop/src/main/host/hostIpc.ts` |
| Memória do aviso (uma vez só) | `apps/desktop/src/main/trayNoticeMemory.ts` |
| Testes | `closeToTray.test.ts`, `trayNoticeMemory.test.ts` |

O ouvinte da bandeja é registrado antes do ouvinte do host. Sem pedido de saída, o da bandeja cancela o fechamento e esconde; o do host sai sem fazer nada, porque `quit.quitting()` é falso.

## O que este ambiente não prova

A bandeja, o balão e a atualização só aparecem num Windows com o app aberto. Os testes cobrem a regra de esconder ou sair e os textos. O balão, o menu do ícone e o fluxo com o host ligado precisam ser vistos no Windows.
