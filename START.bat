@echo off
:: AuftragsScout starten - einfach doppelklicken
set "DIR=%~dp0"
start "" "msedge.exe" --new-window "%DIR%index.html"
