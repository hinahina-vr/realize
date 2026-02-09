@echo off
echo ============================================
echo   Realize Virtual Camera - 仮想カメラ登録
echo ============================================
echo.
echo 仮想カメラ(Realize Virtual Camera)を登録中...
regsvr32 /s "%~dp0..\resources\vcam-service.dll"
if %errorlevel% equ 0 (
    echo 登録に成功しました！
) else (
    echo エラー: 登録に失敗しました。管理者権限で実行してください。
)
echo.
pause
