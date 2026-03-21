# Stops any stale dfile.backend process (avoids MSB3021 file lock), then runs the API.
# Usage: from repo root:  .\scripts\start-backend.ps1
$ErrorActionPreference = 'Stop'
$backendDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'DFile.backend'
if (-not (Test-Path $backendDir)) {
    Write-Error "DFile.backend not found at $backendDir"
    exit 1
}

Get-Process -Name 'dfile.backend' -ErrorAction SilentlyContinue | Stop-Process -Force
Set-Location $backendDir
Write-Host "Starting API from $backendDir (Ctrl+C to stop)" -ForegroundColor Cyan
dotnet run
