# Copy new launcher images into Android res drawable-nodpi so adaptive icons use them
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repo = Resolve-Path "$root\.."
$srcFore = "$repo\assets\foreground-new.png"
$srcBack = "$repo\assets\background-new.png"
$destDir = "$repo\android\app\src\main\res\drawable-nodpi"
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir | Out-Null }
if (Test-Path $srcFore) { Copy-Item -Force $srcFore "$destDir\ic_foreground_new.png" }
else { Write-Host "foreground source not found: $srcFore" }
if (Test-Path $srcBack) { Copy-Item -Force $srcBack "$destDir\ic_background_new.png" }
else { Write-Host "background source not found: $srcBack" }
Write-Host "Copied launcher images to $destDir"
