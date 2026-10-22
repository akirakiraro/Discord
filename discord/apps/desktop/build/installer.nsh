; O template do electron-builder não cria o atalho da área de trabalho durante
; uma atualização (--updated + --keep-shortcuts), mesmo com
; createDesktopShortcut "always". Aqui só criamos o .lnk se ele ainda não
; existir: quem já tem o atalho não é tocado.
!macro customInstall
  ${ifNot} ${FileExists} "$newDesktopLink"
    CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
    System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
  ${endIf}
!macroend
