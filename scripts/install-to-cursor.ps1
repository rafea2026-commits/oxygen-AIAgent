# Install Oxygen into Cursor (registers extension properly)
param(
    [string]$SourceRoot = (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)),
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$pkg = Get-Content (Join-Path $SourceRoot 'package.json') -Raw | ConvertFrom-Json
$version = $pkg.version
$publisher = $pkg.publisher
$name = $pkg.name
$extId = "$publisher.$name"
$folderName = "$extId-$version"

$cursorExtRoot = Join-Path $env:USERPROFILE '.cursor\extensions'
$target = Join-Path $cursorExtRoot $folderName
$registryPath = Join-Path $cursorExtRoot 'extensions.json'
$obsoletePath = Join-Path $cursorExtRoot '.obsolete'

Write-Host 'Oxygen install -> Cursor'
Write-Host "  Version: $version"
Write-Host "  Target:  $target"
Write-Host ''
if (-not $Force) {
    Write-Host 'IMPORTANT: Close ALL Cursor windows before continuing.'
    Write-Host 'Press Enter when Cursor is fully closed, or Ctrl+C to cancel.'
    Read-Host | Out-Null
}

if (-not (Test-Path $cursorExtRoot)) {
    New-Item -ItemType Directory -Path $cursorExtRoot -Force | Out-Null
}

# Remove old oxygen copies
Get-ChildItem $cursorExtRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like 'oxygen.oxygen-aiagent-*' } |
    ForEach-Object {
        Write-Host "Removing old folder: $($_.Name)"
        Remove-Item $_.FullName -Recurse -Force
    }

if (Test-Path $target) {
    Remove-Item $target -Recurse -Force
}

$exclude = @('node_modules', '.git', '.vscode-test', 'test', '.oxygen', '*.vsix')
New-Item -ItemType Directory -Path $target -Force | Out-Null

Get-ChildItem $SourceRoot -Force | Where-Object {
    $exclude -notcontains $_.Name -and $_.Name -notlike '*.vsix'
} | ForEach-Object {
    Copy-Item $_.FullName -Destination $target -Recurse -Force
}

# Remove from .obsolete (Cursor ignores extensions listed here)
if (Test-Path $obsoletePath) {
    $obsolete = Get-Content $obsoletePath -Raw | ConvertFrom-Json
    $changed = $false
    @($obsolete.PSObject.Properties.Name) | Where-Object { $_ -like 'oxygen.oxygen-aiagent-*' } | ForEach-Object {
        Write-Host "Removing from .obsolete: $_"
        $obsolete.PSObject.Properties.Remove($_) | Out-Null
        $changed = $true
    }
    if ($changed) {
        $obsolete | ConvertTo-Json -Compress | Set-Content $obsoletePath -Encoding UTF8
    }
}

# Register in extensions.json
$unixPath = $target -replace '\\', '/'
if ($unixPath -match '^([A-Za-z]):(.*)$') {
    $unixPath = '/' + $Matches[1].ToLower() + $Matches[2]
}

$entry = [ordered]@{
    identifier = [ordered]@{ id = $extId }
    version    = $version
    location   = [ordered]@{
        '$mid'     = 1
        fsPath     = $target
        '_sep'     = 1
        external   = ('file:///' + ($target -replace '\\', '/'))
        path       = $unixPath
        scheme     = 'file'
    }
    relativeLocation = $folderName
    metadata   = [ordered]@{
        installedTimestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        pinned             = $false
        source             = 'vsix'
        publisherDisplayName = $publisher
        isPreReleaseVersion  = $false
        hasPreReleaseVersion = $false
    }
}

$list = @()
if (Test-Path $registryPath) {
    $raw = Get-Content $registryPath -Raw
    if ($raw.Trim()) {
        $list = @($raw | ConvertFrom-Json)
    }
}

$list = @($list | Where-Object { $_.identifier.id -ne $extId })
$list += ,([pscustomobject]$entry)
($list | ConvertTo-Json -Depth 10 -Compress) | Set-Content $registryPath -Encoding UTF8

Write-Host ''
Write-Host "Installed and registered: $folderName"
Write-Host ''
Write-Host 'Next steps:'
Write-Host '  1. Open Cursor'
Write-Host '  2. Open your project'
Write-Host '  3. Bottom-left: O2 Oxygen | -tok | $saved'
Write-Host '  4. Ctrl+Shift+P -> Oxygen: Copy Context Bundle'
Write-Host ''
