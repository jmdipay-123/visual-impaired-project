@echo off
setlocal ENABLEEXTENSIONS
title PiCam Fix Start

rem ---------- CONFIG ----------

set PI_USER=jmdipay
set PI_HOST=192.168.100.50
set PI_PORT=22


set PI_SCRIPT=pi_cam_server.py
set REMOTE_PATH=/home/%PI_USER%/%PI_SCRIPT%
set LOG_PATH=/home/%PI_USER%/pi_cam_server.log
set OPEN_SITE_URL=http://localhost:3000
set OPEN_STREAM_URL=http://%PI_HOST%:3001/video
set OPEN_SNAP_URL=http://%PI_HOST%:3001/snapshot.jpg
rem ----------------------------

where ssh >nul 2>&1 || (echo ERROR: ssh not found. Install OpenSSH Client in Windows Optional Features. & pause & exit /b)
where scp >nul 2>&1 || (echo ERROR: scp not found. Install OpenSSH Client. & pause & exit /b)

echo Checking Pi reachability %PI_HOST% ...
ping -n 1 %PI_HOST% >nul 2>&1 || (echo ERROR: Pi not reachable. Check IP and network. & pause & exit /b)

if not exist "%~dp0%PI_SCRIPT%" (
  echo ERROR: Missing %PI_SCRIPT% next to this BAT. Put the file in the same folder.
  pause & exit /b
)

echo Uploading script to Pi ...
scp -o StrictHostKeyChecking=no "%~dp0%PI_SCRIPT%" %PI_USER%@%PI_HOST%:%REMOTE_PATH% || (echo ERROR: scp failed. & pause & exit /b)

echo Installing Flask and Picamera2 if needed ...
ssh %PI_USER%@%PI_HOST% "set -e; if ! dpkg -s python3-flask >/dev/null 2>&1; then sudo apt-get update && sudo apt-get install -y python3-flask; fi; if ! python3 - <<<'import picamera2' 1>/dev/null 2>&1; then sudo apt-get install -y python3-picamera2; fi" || (echo ERROR: dependency install failed. & pause & exit /b)

echo Starting server in background ...
ssh %PI_USER%@%PI_HOST% "nohup python3 %REMOTE_PATH% >%LOG_PATH% 2>&1 & echo STARTED" || (echo ERROR: start failed. & pause & exit /b)

echo Opening pages ...
start "" "%OPEN_SITE_URL%"
start "" "%OPEN_STREAM_URL%"

echo Done.
echo Stream:  %OPEN_STREAM_URL%
echo Snapshot: %OPEN_SNAP_URL%
echo Log on Pi: %LOG_PATH%
echo If camera permission errors occur on Pi: sudo usermod -aG video,render $USER && sudo reboot
pause
