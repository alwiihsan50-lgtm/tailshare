@echo off
:: ============================================================================
:: TailShare Automated Installer & Setup Script for Windows
:: ============================================================================
title TailShare Windows Installer
color 0A
cls

echo ============================================================================
echo                      TAILSHARE INSTALLER UNTUK WINDOWS
echo           Sinkronisasi Clipboard & Berbagi File Lintas Perangkat
echo ============================================================================
echo.

:: 1. Check if Node.js is installed
echo [1/5] Memeriksa instalasi Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Node.js belum terinstall di Windows!
    echo Membuka halaman unduh resmi Node.js...
    start https://nodejs.org/en/download
    echo.
    echo Silakan download dan install Node.js terlebih dahulu, lalu jalankan file installer ini kembali.
    pause
    exit /b
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo    [OK] Node.js terdeteksi (%NODE_VER%)
echo.

:: 2. Install NPM dependencies
echo [2/5] Menginstall dependensi modul TailShare...
cd /d "%~dp0"
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Gagal menginstall dependensi NPM. Periksa koneksi internet Anda.
    pause
    exit /b
)
echo    [OK] Dependensi berhasil diinstall.
echo.

:: 3. Create target folder for downloads
echo [3/5] Menyiapkan direktori penyimpanan file...
if exist "D:\" (
    if not exist "D:\Downloads\TailShare" mkdir "D:\Downloads\TailShare" 2>nul
    echo    [OK] Menggunakan D:\Downloads\TailShare
) else (
    if not exist "%USERPROFILE%\Downloads\TailShare" mkdir "%USERPROFILE%\Downloads\TailShare" 2>nul
    echo    [OK] Menggunakan %USERPROFILE%\Downloads\TailShare
)
echo.

:: 4. Create auto-start scripts in Windows Startup Folder
echo [4/5] Mengaktifkan Auto-Start saat Windows Dinyalakan...
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "wscript.exe """"%~dp0launch-silent.vbs""""", 0, False
) > "%STARTUP_FOLDER%\TailShare-AutoStart.vbs"
echo    [OK] Auto-Start berhasil dipasang di folder Startup Windows!
echo.

:: 5. Create Desktop Shortcut
echo [5/5] Membuat Shortcut di Desktop...
set "DESKTOP_FOLDER=%USERPROFILE%\Desktop"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%DESKTOP_FOLDER%\TailShare.url'); $s.TargetPath='http://localhost:40506'; $s.Save()" >nul
echo    [OK] Shortcut 'TailShare' berhasil dibuat di Desktop Anda!
echo.

:: 6. Launch TailShare Now
echo ============================================================================
echo Menjalankan TailShare Sekarang...
echo ============================================================================
start "" wscript "%~dp0launch-silent.vbs"

color 0A
echo.
echo INSTALLASI SELESAI DAN SUKSES!
echo ----------------------------------------------------------------------------
echo Server TailShare sudah otomatis berjalan di background (Port 40506).
echo Anda dapat membuka web app di browser: http://localhost:40506
echo TailShare akan OTOMATIS BERJALAN setiap kali Windows dinyalakan!
echo ============================================================================
echo.
pause
