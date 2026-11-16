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
  pause
  exit /b 1
)

echo 正在启动 校园委托 服务（带访问口令，适合发给别人）...
echo 启动后窗口会显示「访问口令」和「分享链接」，照着打开即可。
echo 关闭服务：在这个窗口按 Ctrl+C
echo.
"%NODE_BIN%" server.js
echo.
echo 服务已停止。按任意键关闭窗口。
pause >nul
