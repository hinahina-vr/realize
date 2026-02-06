; Realize Virtual Camera Installer Script
; vcam-service.dll を自動登録/解除する

!macro customInstall
  ; インストール時にvcam-service.dllを登録
  DetailPrint "仮想カメラを登録中..."
  nsExec::ExecToLog 'regsvr32 /s "$INSTDIR\resources\vcam-service.dll"'
  Pop $0
  ${If} $0 != 0
    DetailPrint "警告: 仮想カメラの登録に失敗しました (エラーコード: $0)"
  ${Else}
    DetailPrint "仮想カメラを登録しました"
  ${EndIf}
!macroend

!macro customUnInstall
  ; アンインストール時にvcam-service.dllを解除
  DetailPrint "仮想カメラを解除中..."
  nsExec::ExecToLog 'regsvr32 /u /s "$INSTDIR\resources\vcam-service.dll"'
  Pop $0
  ${If} $0 != 0
    DetailPrint "警告: 仮想カメラの解除に失敗しました (エラーコード: $0)"
  ${Else}
    DetailPrint "仮想カメラを解除しました"
  ${EndIf}
!macroend
