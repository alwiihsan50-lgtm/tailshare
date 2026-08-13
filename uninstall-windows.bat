@echo off
title TailShare Windows Uninstaller
color 0C
cls

echo ============================================================================
echo                    HAPUS AUTO-START TAILSHARE WINDOWS
echo ============================================================================
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if exist "%STARTUP_FOLDER%\TailShare-AutoStart.vbs" (
    del /f /q "%STARTUP_FOLDER%\TailShare-AutoStart.vbs"
    echo [OK] Auto-Start di Startup Folder berhasil dihapus.
) else (
    echo [INFO] Auto-Start di Startup Folder tidak ditemukan.
)

set "DESKTOP_FOLDER=%USERPROFILE%\Desktop"
if exist "%DESKTOP_FOLDER%\TailShare.url" (
    del /f /q "%DESKTOP_FOLDER%\TailShare.url"
    echo [OK] Shortcut Desktop berhasil dihapus.
)

echo.
echo Auto-start TailShare pada Windows telah dinonaktifkan.
echo.
pause
