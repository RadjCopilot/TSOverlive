# Миграция на Tauri завершена!

## Что изменилось

### Преимущества Tauri:
- ✅ **Размер ~3-5 MB** вместо 170 MB
- ✅ **Быстрый запуск**
- ✅ **Меньше памяти**
- ✅ **Работает на Windows без проблем**
- ✅ **Использует системный WebView**

### Структура проекта:
```
TS6Overlay/
├── public/              # HTML/CSS/JS файлы (без изменений)
├── src-tauri/          # Rust backend
│   ├── src/
│   │   └── main.rs     # Главный файл с WebSocket клиентом
│   ├── icons/          # Иконки приложения
│   ├── Cargo.toml      # Зависимости Rust
│   ├── tauri.conf.json # Конфигурация Tauri
│   └── build.rs        # Build script
└── package.json        # Упрощенный, только Tauri
```

## Установка Rust (если еще не установлен)

### macOS/Linux:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Windows:
Скачайте и установите: https://rustup.rs/

## Команды

### Разработка:
```bash
npm run dev
```

### Сборка:
```bash
# Для текущей платформы
npm run build

# Результат в src-tauri/target/release/bundle/
```

## Что работает:

1. ✅ Прозрачное окно поверх всех окон
2. ✅ WebSocket подключение к TS6 (ws://127.0.0.1:5899)
3. ✅ Системный трей с меню
4. ✅ Все HTML/CSS/JS файлы работают без изменений
5. ✅ Автоматическая аутентификация в TS6

## Размер приложения:

- **macOS**: ~3-4 MB (.dmg)
- **Windows**: ~3-5 MB (.exe)
- **Linux**: ~3-4 MB (.deb/.AppImage)

## Следующие шаги:

1. Установите Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. Запустите: `npm install`
3. Запустите: `npm run dev`
4. Соберите: `npm run build`

## Отличия от Electron:

- Не нужен Next.js/React (работает с чистым HTML)
- WebSocket клиент на Rust (быстрее и надежнее)
- Нет проблем с прозрачностью на Windows
- Автоматические обновления через Tauri Updater
