; Vision360 Windows setup.
; Default folder is the existing Vision360 software directory.
; This setup does not copy or delete those program files.
; It runs the FTDI driver installer, then creates shortcuts.

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "WinMessages.nsh"

!define PRODUCT_NAME "Vision360"
!define PRODUCT_VERSION "1.0.0.0"
!define SOFTWARE_DIR "D:\New folder (2)\SOFTWARE\02_Vision360_EXE"
!define SETUP_REG_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Vision360"
!define SETUP_DIR "$PROGRAMFILES\Vision360 Setup"

Name "${PRODUCT_NAME}"
OutFile "dist/Vision360-Setup.exe"
Unicode True
SetCompress off
InstallDir "${SOFTWARE_DIR}"
InstallDirRegKey HKLM "Software\Vision360" "InstallLocation"
RequestExecutionLevel admin
ShowInstDetails show
BrandingText "${PRODUCT_NAME}"

VIProductVersion "${PRODUCT_VERSION}"
VIAddVersionKey "ProductName" "${PRODUCT_NAME} Setup"
VIAddVersionKey "FileDescription" "Installs the FTDI driver and creates Vision360 shortcuts"
VIAddVersionKey "FileVersion" "${PRODUCT_VERSION}"
VIAddVersionKey "ProductVersion" "${PRODUCT_VERSION}"
VIAddVersionKey "CompanyName" "Vision360"
VIAddVersionKey "LegalCopyright" "Vision360"

!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"
!define MUI_WELCOMEPAGE_TITLE "Vision360 setup"
!define MUI_WELCOMEPAGE_TEXT "This setup uses the Vision360 folder already on this PC. It does not replace the program files.$\r$\n$\r$\n${SOFTWARE_DIR}$\r$\n$\r$\nIt will run CDM212364_Setup.exe, then add Desktop and Start menu shortcuts for Vision360.exe and V360Upload.exe.$\r$\n$\r$\nYou can confirm the folder on the next page. Vision360.exe, V360Upload.exe, and CDM212364_Setup.exe must be in that folder."
!define MUI_DIRECTORYPAGE_TEXT_TOP "Confirm the folder that already contains Vision360.exe, V360Upload.exe, and CDM212364_Setup.exe."
!define MUI_FINISHPAGE_TITLE "Vision360 shortcuts are ready"
!define MUI_FINISHPAGE_TEXT "CDM212364_Setup.exe has been run.$\r$\n$\r$\nDesktop and Start menu shortcuts were created for Vision360 and V360 Upload. The programs remain in the folder you confirmed."
!define MUI_FINISHPAGE_NOREBOOTSUPPORT

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Function .onInit
  SetShellVarContext all
FunctionEnd

Function un.onInit
  SetShellVarContext all
FunctionEnd

Function CheckRequiredFiles
  StrCpy $0 "$INSTDIR\Vision360.exe"
  IfFileExists "$0" 0 missing
  StrCpy $0 "$INSTDIR\V360Upload.exe"
  IfFileExists "$0" 0 missing
  StrCpy $0 "$INSTDIR\CDM212364_Setup.exe"
  IfFileExists "$0" 0 missing
  Return
missing:
  MessageBox MB_ICONSTOP "Required file not found:$\n$0$\n$\nKeep Vision360.exe, V360Upload.exe, and CDM212364_Setup.exe together in$\n$INSTDIR"
  Abort
FunctionEnd

Section "Vision360" SecMain
  Call CheckRequiredFiles

  DetailPrint "Running FTDI driver setup: $INSTDIR\CDM212364_Setup.exe"
  ExecWait '"$INSTDIR\CDM212364_Setup.exe"' $R0
  ${If} $R0 == 0
    DetailPrint "FTDI driver setup finished."
  ${ElseIf} $R0 == 3010
    MessageBox MB_ICONINFORMATION "The FTDI driver was installed. Restart Windows after this setup finishes."
  ${Else}
    MessageBox MB_ICONEXCLAMATION "CDM212364_Setup.exe returned $R0.$\n$\nShortcuts will still be created. If the driver window reported an error, run CDM212364_Setup.exe again from$\n$INSTDIR"
  ${EndIf}

  ; SetOutPath sets the shortcut "Start in" directory to the software folder.
  SetOutPath "$INSTDIR"
  CreateDirectory "$SMPROGRAMS\Vision360"
  CreateShortcut "$DESKTOP\Vision360.lnk" "$INSTDIR\Vision360.exe" "" "$INSTDIR\Vision360.exe" 0 SW_SHOWNORMAL "" "Vision360"
  CreateShortcut "$SMPROGRAMS\Vision360\Vision360.lnk" "$INSTDIR\Vision360.exe" "" "$INSTDIR\Vision360.exe" 0 SW_SHOWNORMAL "" "Vision360"
  CreateShortcut "$DESKTOP\V360 Upload.lnk" "$INSTDIR\V360Upload.exe" "" "$INSTDIR\V360Upload.exe" 0 SW_SHOWNORMAL "" "V360 Upload"
  CreateShortcut "$SMPROGRAMS\Vision360\V360 Upload.lnk" "$INSTDIR\V360Upload.exe" "" "$INSTDIR\V360Upload.exe" 0 SW_SHOWNORMAL "" "V360 Upload"

  SetOutPath "${SETUP_DIR}"
  WriteUninstaller "${SETUP_DIR}\Uninstall.exe"
  WriteRegStr HKLM "Software\Vision360" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${SETUP_REG_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "${SETUP_REG_KEY}" "DisplayVersion" "1.0.0"
  WriteRegStr HKLM "${SETUP_REG_KEY}" "Publisher" "${PRODUCT_NAME}"
  WriteRegStr HKLM "${SETUP_REG_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${SETUP_REG_KEY}" "UninstallString" '"${SETUP_DIR}\Uninstall.exe"'
  WriteRegDWORD HKLM "${SETUP_REG_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "${SETUP_REG_KEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\Vision360.lnk"
  Delete "$DESKTOP\V360 Upload.lnk"
  Delete "$SMPROGRAMS\Vision360\Vision360.lnk"
  Delete "$SMPROGRAMS\Vision360\V360 Upload.lnk"
  RMDir "$SMPROGRAMS\Vision360"

  Delete "${SETUP_DIR}\Uninstall.exe"
  RMDir "${SETUP_DIR}"
  DeleteRegKey HKLM "${SETUP_REG_KEY}"
  DeleteRegKey HKLM "Software\Vision360"
SectionEnd
