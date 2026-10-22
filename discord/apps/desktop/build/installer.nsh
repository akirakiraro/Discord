; O template do electron-builder (include/installer.nsh, addDesktopLink) só recria
; o atalho da área de trabalho quando NÃO é atualização. Com --updated e
; --keep-shortcuts, createDesktopShortcut "always" também não cria o .lnk
; se a pessoa apagou ou se a versão anterior nunca criou. customInstall roda
; depois disso, na instalação nova e na atualização.
!macro customInstall
  CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
  ClearErrors
  WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend
