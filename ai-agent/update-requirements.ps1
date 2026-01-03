#!/usr/bin/env pwsh
<#!
.SYNOPSIS
Generates requirements.txt from pyproject.toml using uv (Windows friendly).
#>

$ErrorActionPreference = 'Stop'

Set-Location -Path $PSScriptRoot

function Assert-UvInstalled {
    if (-not (Get-Command -Name uv -ErrorAction SilentlyContinue)) {
        Write-Host "Error: uv is not installed." -ForegroundColor Red
        Write-Host "Install it via winget (winget install astral-sh.uv) or PowerShell:" -ForegroundColor Yellow
        Write-Host "  irm https://astral.sh/uv/install.ps1 | iex" -ForegroundColor Yellow
        throw "uv command not found"
    }
}

Assert-UvInstalled

$venvPath = Join-Path -Path $PSScriptRoot -ChildPath '.venv'
if (-not (Test-Path -Path $venvPath)) {
    Write-Host 'Creating virtual environment with Python 3.12...'
    uv venv --python 3.12
}

Write-Host 'Syncing dependencies from pyproject.toml...'
uv sync --no-dev

Write-Host 'Generating requirements.txt...'
$requirements = uv pip freeze |
    Where-Object { ($_ -notmatch 'kayak-ai-agent') -and ($_ -notmatch 'file://') }
$targetPath = Join-Path -Path $PSScriptRoot -ChildPath 'requirements.txt'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($targetPath, $requirements, $utf8NoBom)

Write-Host 'requirements.txt generated successfully'
