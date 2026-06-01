@echo off
chcp 65001 >nul
cd /d "%~dp0"

where bun >nul 2>&1
if errorlevel 1 (
    echo [エラー] Bun が見つかりません。
    echo https://bun.sh/ からインストールしてから、もう一度実行してください。
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [setup] 依存関係をインストールしています...
    call bun install
    if errorlevel 1 (
        echo [エラー] bun install に失敗しました。
        pause
        exit /b 1
    )
)

echo [dev] ローカルサーバーを起動します...
echo.
call bun run dev
pause
