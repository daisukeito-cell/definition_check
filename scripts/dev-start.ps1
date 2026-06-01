# ローカル開発サーバー起動（PowerShell）
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "[エラー] Bun が見つかりません。https://bun.sh/ からインストールしてください。" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Host "[setup] bun install ..."
    bun install
}

Write-Host "[dev] 起動中..." -ForegroundColor Cyan
bun run dev
