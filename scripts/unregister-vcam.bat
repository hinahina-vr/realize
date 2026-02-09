@echo off
echo ============================================
echo   Realize Virtual Camera - 仮想カメラ解除
echo ============================================
echo.
echo 仮想カメラ(Realize Virtual Camera)を解除中...
regsvr32 /u /s "%~dp0..\resources\vcam-service.dll"
if %errorlevel% equ 0 (
    echo 解除に成功しました！
) else (
    echo エラー: 解除に失敗しました。管理者権限で実行してください。
)
echo.
pause
