# Copies Android mipmap-xxxhdpi/ic_launcher_round.png to assets/favicon.png so the app header uses the same icon as the APK
$source = "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png"
$dest = "assets/favicon.png"
if (-Not (Test-Path $source)) {
    Write-Error "Source icon not found: $source"
    exit 1
}
Copy-Item -Path $source -Destination $dest -Force
Write-Output "Copied $source -> $dest"
