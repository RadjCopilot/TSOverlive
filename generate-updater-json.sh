#!/bin/bash

# Скрипт для генерации updater.json после сборки

VERSION=$(node -p "require('./package.json').version")
GITHUB_USER="YOUR_USERNAME"
GITHUB_REPO="TS6Overlay"

echo "Generating updater.json for version $VERSION..."

# Пути к файлам подписей
MAC_SIG="src-tauri/target/universal-apple-darwin/release/bundle/dmg/TeamSpeak OverLive_${VERSION}_universal.dmg.tar.gz.sig"
WIN_SIG="src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/TeamSpeak OverLive_${VERSION}_x64_en-US.msi.zip.sig"

# Читаем подписи
if [ -f "$MAC_SIG" ]; then
    MAC_SIGNATURE=$(cat "$MAC_SIG")
    echo "✓ macOS signature found"
else
    MAC_SIGNATURE=""
    echo "⚠ macOS signature not found"
fi

if [ -f "$WIN_SIG" ]; then
    WIN_SIGNATURE=$(cat "$WIN_SIG")
    echo "✓ Windows signature found"
else
    WIN_SIGNATURE=""
    echo "⚠ Windows signature not found"
fi

# Генерируем updater.json
cat > updater.json << EOF
{
  "version": "$VERSION",
  "notes": "См. RELEASE_NOTES_v${VERSION}.md для подробностей",
  "pub_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "platforms": {
    "darwin-universal": {
      "signature": "$MAC_SIGNATURE",
      "url": "https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases/download/v${VERSION}/TeamSpeak.OverLive_${VERSION}_universal.dmg.tar.gz"
    },
    "windows-x86_64": {
      "signature": "$WIN_SIGNATURE",
      "url": "https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases/download/v${VERSION}/TeamSpeak.OverLive_${VERSION}_x64_en-US.msi.zip"
    }
  }
}
EOF

echo "✓ updater.json generated successfully"
cat updater.json
