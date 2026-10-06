@echo off
cd /d "%~dp0"
title GALI Dashboard
call npm run local
if errorlevel 1 pause
