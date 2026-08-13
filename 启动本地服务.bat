@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "node_modules" (
  echo 正在安装依赖，请稍候...
  call npm install
  if errorlevel 1 goto :error
)

echo 正在生成生产版本...
call npm run build
if errorlevel 1 goto :error

echo.
echo 本地服务地址：http://127.0.0.1:4173
echo 关闭此窗口即可停止服务。
start "" "http://127.0.0.1:4173"
call npm run start
exit /b 0

:error
echo.
echo 启动失败，请检查上方错误信息。
pause
exit /b 1
