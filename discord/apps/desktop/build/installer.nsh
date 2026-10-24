; O template do electron-builder não cria o atalho da área de trabalho durante
; uma atualização (--updated + --keep-shortcuts), mesmo com
; createDesktopShortcut "always". Aqui só criamos o .lnk se ele ainda não
; existir: quem já tem o atalho não é tocado.
; O atalho antigo se chamava Radcord. Se a atualização não o renomeou,
; apagamos só esse .lnk, nunca o atalho com o nome atual.
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
!macroend
