# Generates Android launcher icons from assets\yuvaupdate.png and copies them to mipmap folders
# Tries ImageMagick (magick) first; if not available, falls back to PowerShell/.NET resizing

$src = Join-Path $PSScriptRoot "..\assets\yuvaupdate.png"
$resDir = Join-Path $PSScriptRoot "..\android\app\src\main\res"

if (-not (Test-Path $src)) {
    Write-Error "Source file not found: $src. Place yuvaupdate.png in assets folder."
    exit 1
}

$sizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

function Use-ImageMagick {
    try {
        $null = & magick -version 2>$null
        return $true
    } catch {
        return $false
    }
}

function Resize-WithDotNet($inPath, $outPath, [int]$size) {
    Write-Host "Resizing with .NET: $inPath -> $outPath ($size x $size)"
    Add-Type -AssemblyName System.Drawing
    try {
        $img = [System.Drawing.Image]::FromFile($inPath)
        $bmp = New-Object System.Drawing.Bitmap $size, $size
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, 0, 0, $size, $size)
        $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose()
        $bmp.Dispose()
        $img.Dispose()
    } catch {
        Write-Error ("Failed to resize {0}: {1}" -f $inPath, $_)
        throw
    }
}

$useMagick = Use-ImageMagick
if ($useMagick) {
    Write-Host "ImageMagick found. Using magick to resize images."
    foreach ($dir in $sizes.Keys) {
        $size = $sizes[$dir]
        $outPng = Join-Path $resDir "$dir\ic_launcher.png"
        Write-Host "Generating $outPng ($size x $size)"
        & magick convert $src -resize ${size}x${size} $outPng
    }
    # Copy a high-res variant for adaptive foreground
    $foregroundOut = Join-Path $resDir 'mipmap-anydpi-v26\ic_launcher.png'
    Copy-Item $src $foregroundOut -Force
    Write-Host "Copied adaptive foreground to $foregroundOut"
} else {
    Write-Host "ImageMagick not found. Falling back to PowerShell/.NET resizing."
    foreach ($dir in $sizes.Keys) {
        $size = $sizes[$dir]
        $outPng = Join-Path $resDir "$dir\ic_launcher.png"
        $outDir = Split-Path $outPng -Parent
        if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
        Resize-WithDotNet -inPath $src -outPath $outPng -size $size
    }
    # Copy a high-res variant for adaptive foreground
    $foregroundOut = Join-Path $resDir 'mipmap-anydpi-v26\ic_launcher.png'
    $fgDir = Split-Path $foregroundOut -Parent
    if (-not (Test-Path $fgDir)) { New-Item -ItemType Directory -Path $fgDir | Out-Null }
    Copy-Item $src $foregroundOut -Force
    Write-Host "Copied adaptive foreground to $foregroundOut"
}

Write-Host "Done. You can now rebuild the Android app to see the new launcher icon."

# --- Additional: generate foreground and round PNGs and remove existing webp variants ---
Write-Host "Generating ic_launcher_foreground.png and ic_launcher_round.png in mipmap folders..."
foreach ($dir in $sizes.Keys) {
    $size = $sizes[$dir]
    $outDir = Join-Path $resDir $dir
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

    $foregroundOut = Join-Path $outDir 'ic_launcher_foreground.png'
    $roundOut = Join-Path $outDir 'ic_launcher_round.png'

    if ($useMagick) {
        & magick convert $src -resize ${size}x${size} $foregroundOut
        & magick convert $src -resize ${size}x${size} $roundOut
    } else {
        Resize-WithDotNet -inPath $src -outPath $foregroundOut -size $size
        Resize-WithDotNet -inPath $src -outPath $roundOut -size $size
    }

    # Remove existing .webp files if present to avoid conflicts
    $webpFore = Join-Path $outDir 'ic_launcher_foreground.webp'
    $webpRound = Join-Path $outDir 'ic_launcher_round.webp'
    if (Test-Path $webpFore) { Remove-Item $webpFore -Force }
    if (Test-Path $webpRound) { Remove-Item $webpRound -Force }
    Write-Host "Updated $outDir"
}

# Also ensure mipmap-anydpi-v26 has a round/adaptive xml pointing to the new foreground name (no change needed typically)
Write-Host "Foreground and round PNGs generated and old webp files removed (if present)."
