@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "NODE_BIN="
where node >nul 2>nul && set "NODE_BIN=node"
if not defined NODE_BIN (
  for /d %%D in ("%USERPROFILE%\.workbuddy-ai\binaries\node\versions\*") do (
    if exist "%%D\node.exe" set "NODE_BIN=%%D\node.exe"
  )
)
if not defined NODE_BIN (
  echo 找不到 Node.js。请先安装：https://nodejs.org 下载 LTS 版
  echo 或者确认 WorkBuddy 自带的 Node 是否存在。
  pause
  exit /b 1
)

echo 正在启动 校园委托 服务（免口令模式，适合演示/录视频）...
echo 启动后浏览器打开： http://localhost:3000
echo 关闭服务：在这个窗口按 Ctrl+C
echo.
set "ACCESS_KEY=off"
"%NODE_BIN%" server.js
echo.
echo 服务已停止。按任意键关闭窗口。
pause >nul
