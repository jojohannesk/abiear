#!/bin/sh
# Die Android-Fassung bauen und starten.
#
#   ./android.sh emulator   Emulator „AbiEar_Pixel“ starten (Grafik über den Mac)
#   ./android.sh debug      bauen, auf Emulator/Gerät installieren, starten
#   ./android.sh release    App-Bundle (.aab) für Google Play —
#                           braucht android/keystore.properties
#
# Java und SDK kommen aus Homebrew bzw. ~/Library/Android/sdk; beides liegt
# außerhalb des Projekts.
set -eu
cd "$(dirname "$0")"

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="/opt/homebrew/bin:$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

web() { npm run android; }

case "${1:-}" in
  emulator)
    nohup "$ANDROID_HOME/emulator/emulator" -avd AbiEar_Pixel -no-snapshot-save -no-boot-anim -gpu host >/dev/null 2>&1 &
    adb wait-for-device
    until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 2; done
    echo "Emulator läuft."
    ;;
  debug)
    web
    (cd android && ./gradlew -q assembleDebug)
    adb install -r android/app/build/outputs/apk/debug/app-debug.apk
    adb shell am start -n de.abiear.app/.MainActivity
    ;;
  release)
    [ -f android/keystore.properties ] || { echo "android/keystore.properties fehlt — siehe README."; exit 1; }
    web
    (cd android && ./gradlew -q bundleRelease)
    ls -la android/app/build/outputs/bundle/release/
    ;;
  *)
    sed -n '2,9p' "$0"; exit 1
    ;;
esac
