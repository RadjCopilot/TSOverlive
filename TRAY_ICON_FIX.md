# Исправление иконки в трее

## Проблемы
1. ✅ Иконка в трее была белым кругом
2. ✅ Иконка появлялась только когда приложение в фокусе

## Решение

### 1. Создание правильной иконки для трея

Создана универсальная иконка:
- `src-tauri/icons/tray-icon.png` - RGBA формат (32x32, 8-bit/color RGBA)
- Работает на macOS и Windows
- Представляет собой простой микрофон

### 2. Обновление конфигурации

В `tauri.conf.json`:
```json
"systemTray": {
  "iconPath": "icons/tray-icon.png",
  "iconAsTemplate": true
}
```

`iconAsTemplate: true` - важно для macOS, чтобы иконка автоматически адаптировалась под светлую/темную тему.

### 3. Иконка в Rust

Иконка загружается из конфигурации `tauri.conf.json`:

```rust
let system_tray = SystemTray::new().with_menu(tray_menu);
```

Важно: иконка должна быть в формате RGBA (8-bit/color RGBA).

### 4. Исправление видимости трея

Добавлен `setup` хук с установкой `ActivationPolicy::Prohibited` для macOS:

```rust
.setup(|app| {
    #[cfg(target_os = "macos")]
    app.set_activation_policy(tauri::ActivationPolicy::Prohibited);
    Ok(())
})
```

Это скрывает приложение из Dock, но иконка в трее остаётся видимой.

## Пересоздание иконки

Используйте скрипт:

```bash
npm run icons:tray
```

Или вручную:

```bash
cat > /tmp/tray_icon.svg << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <g fill="#000000">
    <rect x="13" y="6" width="6" height="10" rx="3"/>
    <path d="M 10 12 Q 10 18 16 18 Q 22 18 22 12" stroke="#000000" stroke-width="2" fill="none"/>
    <line x1="16" y1="18" x2="16" y2="24" stroke="#000000" stroke-width="2"/>
    <line x1="12" y1="24" x2="20" y2="24" stroke="#000000" stroke-width="2"/>
  </g>
</svg>
EOF

magick -background none -colorspace sRGB -type TrueColorAlpha -density 300 /tmp/tray_icon.svg -resize 32x32 PNG32:src-tauri/icons/tray-icon.png
```

**Важно**: Иконка должна быть в формате RGBA (PNG32), иначе Tauri не сможет её загрузить.

## Результат

- ✅ Иконка микрофона видна в трее всегда (пока приложение запущено)
- ✅ На macOS иконка автоматически меняет цвет в зависимости от темы (iconAsTemplate: true)
- ✅ На Windows иконка чёрная (микрофон)
- ✅ Приложение не показывается в Dock на macOS
- ✅ Формат RGBA работает на всех платформах
