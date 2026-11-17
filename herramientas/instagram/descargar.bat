@echo off
rem Descarga solo las fotos de un perfil de Instagram. Ver descargar.py para opciones.
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Preparando el programa por primera vez...
  python -m venv .venv
  .venv\Scripts\python -m pip install --quiet --disable-pip-version-check instaloader
)
.venv\Scripts\python descargar.py %*
echo.
pause
