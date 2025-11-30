#!/bin/bash

# Скрипт для создания иконок трея для TS6 OverLive
# Требует: ImageMagick (brew install imagemagick)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ICONS_DIR="$SCRIPT_DIR/src-tauri/icons"

echo "Creating tray icons..."

# Создаем SVG для macOS (монохромная)
cat > /tmp/tray_icon_mac.svg << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <g fill="black">
    <!-- Капсюль микрофона -->
    <rect x="13" y="6" width="6" height="10" rx="3"/>
    <!-- Дуги по бокам -->
    <path d="M 10 12 Q 10 18 16 18 Q 22 18 22 12" stroke="black" stroke-width="2" fill="none"/>
    <!-- Ножка -->
    <line x1="16" y1="18" x2="16" y2="24" stroke="black" stroke-width="2"/>
    <!-- Основание -->
    <line x1="12" y1="24" x2="20" y2="24" stroke="black" stroke-width="2"/>
  </g>
</svg>
EOF

# Создаем SVG для Windows (цветная)
cat > /tmp/tray_icon_win.svg << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <g>
    <!-- Капсюль микрофона -->
    <rect x="13" y="6" width="6" height="10" rx="3" fill="#4A90E2"/>
    <!-- Дуги по бокам -->
    <path d="M 10 12 Q 10 18 16 18 Q 22 18 22 12" stroke="#4A90E2" stroke-width="2" fill="none"/>
    <!-- Ножка -->
    <line x1="16" y1="18" x2="16" y2="24" stroke="#4A90E2" stroke-width="2"/>
    <!-- Основание -->
    <line x1="12" y1="24" x2="20" y2="24" stroke="#4A90E2" stroke-width="2.5" stroke-linecap="round"/>
  </g>
</svg>
EOF

# Проверяем наличие ImageMagick
if ! command -v magick &> /dev/null; then
    echo "Error: ImageMagick not found. Install it with: brew install imagemagick"
    exit 1
fi

# Конвертируем SVG в PNG (RGBA формат для Tauri)
echo "Converting tray icon to RGBA format..."
magick -background none -colorspace sRGB -type TrueColorAlpha -density 300 /tmp/tray_icon_mac.svg -resize 32x32 PNG32:"$ICONS_DIR/tray-icon.png"

# Проверяем результат
echo ""
echo "Created icon:"
ls -lh "$ICONS_DIR/tray-icon.png"
echo ""
file "$ICONS_DIR/tray-icon.png"

echo ""
echo "✓ Tray icon created successfully!"
echo ""
echo "Icon: $ICONS_DIR/tray-icon.png (RGBA, works on all platforms)"
