@echo off
title TailShare Server
cd /d "%~dp0"
node src/server/index.js >> "%USERPROFILE%\tailshare_debug.log" 2>&1
