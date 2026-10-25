; O template do electron-builder não cria o atalho da área de trabalho durante
; uma atualização (--updated + --keep-shortcuts), mesmo com
; createDesktopShortcut "always". Aqui só criamos o .lnk se ele ainda não
; existir: quem já tem o atalho não é tocado.
; O atalho antigo se chamava Radcord. Se a atualização não o renomeou,
; apagamos só esse .lnk, nunca o atalho com o nome atual.
;
; A atualização chama este instalador com /S. customInstall entra na seção
; de instalação fora do IfNot Silent, então o atalho continua sendo ajustado
; quando a janela do NSIS não abre.

; Plano B: a primeira instalação, ou um /S que não pegou, ainda mostra a
; janela oneClick. $LANGUAGE no .onInit faz o NSIS usar o português antes
; das páginas, então o título fica "Instalação do SoundRoom" e o banner usa
; o texto pt_BR do electron-builder ("Instalando, por favor aguarde...").
; Não redefinimos LangString: a segunda definição derruba o makensis
; (warningsAsErrors) e quebraria o qa-desktop.yml.
!macro customInit
  !ifdef LANG_PORTUGUESEBR
    StrCpy $LANGUAGE ${LANG_PORTUGUESEBR}
  !endif
!macroend

; O banner do oneClick (controle 1000) só existe quando a janela foi desenhada.
; No silencioso o FindWindow não acha o controle e isto não faz nada.
; Roda depois dos atalhos: um controle ausente não pode impedir a remoção
; do Radcord.lnk.
!macro brandVisibleInstaller
  Push $R9
  FindWindow $R9 "#32770" "" $HWNDPARENT
  FindWindow $R9 "#32770" "" $HWNDPARENT $R9
  GetDlgItem $R9 $R9 1000
  ${if} $R9 <> 0
    SendMessage $R9 ${WM_SETTEXT} 0 "STR:Instalando o SoundRoom. Ele abre sozinho em seguida."
  ${endIf}
  Pop $R9
!macroend

!macro customInstall
  ${ifNot} ${FileExists} "$newDesktopLink"
    CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
    System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
  ${endIf}
  StrCpy $R8 "$DESKTOP\Radcord.lnk"
  ${if} $R8 != $newDesktopLink
    Delete "$R8"
  ${endIf}
  StrCpy $R8 "$SMPROGRAMS\Radcord.lnk"
  ${if} $R8 != $newStartMenuLink
    Delete "$R8"
  ${endIf}
  !insertmacro brandVisibleInstaller
!macroend
