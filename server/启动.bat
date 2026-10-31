@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动 校园委托 服务...
node server.js
echo.
echo 服务已停止。按任意键关闭窗口。
pause >nul
