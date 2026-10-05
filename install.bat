@echo off
echo Cleaning up...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
if exist .vite rmdir /s /q .vite

echo Installing dependencies...
call npm install

echo Starting development server...
call npm run dev
pause