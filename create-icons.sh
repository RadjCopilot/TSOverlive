#!/bin/bash

# Скрипт для создания иконок приложения из PNG с прозрачностью

# Требуется исходный PNG файл с прозрачным фоном (1024x1024)
SOURCE="icon-source.png"

if [ ! -f "$SOURCE" ]; then
    echo "Ошибка: Файл $SOURCE не найден!"
    echo "Создайте PNG файл 1024x1024 с прозрачным фоном"
    exit 1
fi

echo "Создание PNG иконок..."
mkdir -p src-tauri/icons

# Создаем PNG разных размеров
sips -z 16 16 "$SOURCE" --out src-tauri/icons/16x16.png
sips -z 24 24 "$SOURCE" --out src-tauri/icons/24x24.png
sips -z 32 32 "$SOURCE" --out src-tauri/icons/32x32.png
sips -z 48 48 "$SOURCE" --out src-tauri/icons/48x48.png
sips -z 64 64 "$SOURCE" --out src-tauri/icons/64x64.png
sips -z 128 128 "$SOURCE" --out src-tauri/icons/128x128.png
sips -z 256 256 "$SOURCE" --out src-tauri/icons/256x256.png
sips -z 512 512 "$SOURCE" --out src-tauri/icons/512x512.png
sips -z 1024 1024 "$SOURCE" --out src-tauri/icons/1024x1024.png

# Создаем 128x128@2x для Retina
cp src-tauri/icons/256x256.png src-tauri/icons/128x128@2x.png

echo "Создание .icns для macOS..."
# Создаем временную папку для iconset
mkdir -p icon.iconset
cp src-tauri/icons/16x16.png icon.iconset/icon_16x16.png
cp src-tauri/icons/32x32.png icon.iconset/icon_16x16@2x.png
cp src-tauri/icons/32x32.png icon.iconset/icon_32x32.png
cp src-tauri/icons/64x64.png icon.iconset/icon_32x32@2x.png
cp src-tauri/icons/128x128.png icon.iconset/icon_128x128.png
cp src-tauri/icons/256x256.png icon.iconset/icon_128x128@2x.png
cp src-tauri/icons/256x256.png icon.iconset/icon_256x256.png
cp src-tauri/icons/512x512.png icon.iconset/icon_256x256@2x.png
cp src-tauri/icons/512x512.png icon.iconset/icon_512x512.png
cp src-tauri/icons/1024x1024.png icon.iconset/icon_512x512@2x.png

iconutil -c icns icon.iconset -o src-tauri/icons/icon.icns
rm -rf icon.iconset

echo "Создание .ico для Windows..."
# Для Windows нужен ImageMagick
if command -v magick &> /dev/null; then
    magick convert src-tauri/icons/256x256.png src-tauri/icons/128x128.png src-tauri/icons/64x64.png src-tauri/icons/48x48.png src-tauri/icons/32x32.png src-tauri/icons/16x16.png src-tauri/icons/icon.ico
    echo "✓ Иконки созданы успешно!"
else
    echo "⚠ ImageMagick не установлен. Установите: brew install imagemagick"
    echo "Или создайте .ico вручную на https://convertio.co/png-ico/"
fi

echo ""
echo "Готово! Иконки находятся в src-tauri/icons/"
