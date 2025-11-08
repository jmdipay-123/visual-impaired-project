@echo off
setlocal
title PiCam Stop

set PI_USER=jmdipay
set PI_HOST=192.168.100.50
set PI_PORT=22
set PI_SCRIPT=pi_cam_server.py

where ssh >nul 2>&1 || (echo ERROR: ssh not found. Install OpenSSH Client. & pause & exit /b)

echo Stopping server on %PI_HOST% ...
ssh %PI_USER%@%PI_HOST% "pkill -f %PI_SCRIPT% || true"
echo Done.
pause
