@echo off
setlocal
echo ============================================
echo   Realize Virtual Camera - Unregister
echo ============================================
echo.

set "SCRIPT_DIR=%~dp0"
set "DLL_PATH=%SCRIPT_DIR%..\vcam-service.dll"

if not exist "%DLL_PATH%" (
  set "DLL_PATH=%SCRIPT_DIR%..\resources\vcam-service.dll"
)

if not exist "%DLL_PATH%" (
  set "DLL_PATH=%SCRIPT_DIR%..\..\vcam\build\service\Release\vcam-service.dll"
)

if not exist "%DLL_PATH%" (
  echo ERROR: vcam-service.dll was not found.
  echo Checked:
  echo   %SCRIPT_DIR%..\vcam-service.dll
  echo   %SCRIPT_DIR%..\resources\vcam-service.dll
  echo   %SCRIPT_DIR%..\..\vcam\build\service\Release\vcam-service.dll
  echo.
  pause
  exit /b 1
)

echo Unregistering: "%DLL_PATH%"
regsvr32 /u /s "%DLL_PATH%"
set "RC=%ERRORLEVEL%"

if "%RC%"=="0" (
  echo SUCCESS: Virtual camera unregistered.
) else (
  echo ERROR: Unregistration failed. Run this script as Administrator.
  echo regsvr32 exit code: %RC%
)

echo.
pause
exit /b %RC%
