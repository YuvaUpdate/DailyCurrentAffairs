#!/usr/bin/env bash
set -euo pipefail

SDK="/mnt/c/Users/nares/AppData/Local/Android/Sdk"
echo "Using SDK path: $SDK"

mkdir -p "$SDK/cmdline-tools"
cd /tmp

echo "Downloading command-line tools with wget..."
cd /tmp
# use wget with retries and timeout
# use wget with retries and timeout; use a specific known filename from the Android site
CLI_ZIP_URL="https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip"
echo "Downloading $CLI_ZIP_URL"
wget --tries=3 --timeout=30 -q --show-progress "$CLI_ZIP_URL" -O commandlinetools.zip
if [ ! -s commandlinetools.zip ]; then
	echo "Download failed or file empty: /tmp/commandlinetools.zip"
	ls -la /tmp || true
	exit 1
fi
echo "Downloaded file size:"; ls -lh commandlinetools.zip || true
file commandlinetools.zip || true
echo "Listing first bytes of file (for debug):"; head -c 200 commandlinetools.zip || true
unzip -q commandlinetools.zip
rm -f commandlinetools.zip

# The unzip creates a cmdline-tools directory. Move it into the SDK under cmdline-tools/latest
rm -rf "$SDK/cmdline-tools/latest"
mv cmdline-tools "$SDK/cmdline-tools/latest"
chmod -R a+rX "$SDK/cmdline-tools/latest" || true

echo "Running sdkmanager to install platform-tools, platforms;android-35, build-tools;35.0.0 and cmdline-tools;latest"
"$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" "platform-tools" "platforms;android-35" "build-tools;35.0.0" "cmdline-tools;latest" || true

echo "Accepting licenses..."
yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" --licenses || true

echo "Writing local.properties to Android project"
echo "sdk.dir=$SDK" > /mnt/e/DailyCurrentAffairs/DailyCurrentAffairsWorking/android/local.properties
sed -n '1,3p' /mnt/e/DailyCurrentAffairs/DailyCurrentAffairsWorking/android/local.properties || true

cd /mnt/e/DailyCurrentAffairs/DailyCurrentAffairsWorking/android
chmod +x ./gradlew || true

echo "Running Gradle assembleRelease..."
./gradlew clean assembleRelease --warning-mode all --stacktrace

echo "Script completed."
