# Настройка автообновлений

## 1. Генерация ключей подписи

```bash
cd src-tauri
cargo install tauri-cli
cargo tauri signer generate -w ~/.tauri/myapp.key
```

Это создаст:
- Приватный ключ: `~/.tauri/myapp.key` (НЕ ПУБЛИКОВАТЬ!)
- Публичный ключ: будет выведен в консоль

## 2. Добавление публичного ключа в конфиг

Скопируйте публичный ключ из вывода команды и вставьте в `tauri.conf.json`:

```json
"updater": {
  "active": true,
  "endpoints": [
    "https://raw.githubusercontent.com/RadjCopilot/TS6Overlay/main/updater.json"
  ],
  "dialog": true,
  "pubkey": "ВАШ_ПУБЛИЧНЫЙ_КЛЮЧ_ЗДЕСЬ"
}
```

## 3. Сборка релиза

```bash
# macOS
npm run build:mac

# Windows
npm run build:win
```

После сборки будут созданы файлы в `src-tauri/target/`:
- macOS: `universal-apple-darwin/release/bundle/macos/TS6 OverLive.app.tar.gz` + `.sig`
- Windows: `x86_64-pc-windows-msvc/release/bundle/msi/TS6 OverLive_1.0.1_x64_en-US.msi` + `.sig`

## 4. Создание updater.json

Создайте файл `updater.json` в корне репозитория:

```json
{
  "version": "1.0.1",
  "notes": "Исправления:\n- Иконка в трее теперь всегда видна\n- Виджет не прячется автоматически\n- Клик по трею не скрывает виджет",
  "pub_date": "2025-11-30T16:00:00Z",
  "platforms": {
    "darwin-universal": {
      "signature": "СОДЕРЖИМОЕ_ФАЙЛА_.tar.gz.sig",
      "url": "https://github.com/RadjCopilot/TS6Overlay/releases/download/v1.0.1/TS6.OverLive.app.tar.gz"
    },
    "windows-x86_64": {
      "signature": "СОДЕРЖИМОЕ_ФАЙЛА_.msi.sig",
      "url": "https://github.com/RadjCopilot/TS6Overlay/releases/download/v1.0.1/TS6.OverLive_1.0.1_x64_en-US.msi"
    }
  }
}
```

## 5. Публикация релиза

1. Создайте релиз на GitHub: `v1.0.1`
2. Загрузите файлы:
   - `TS6 OverLive.app.tar.gz`
   - `TS6 OverLive_1.0.1_x64_en-US.msi`
3. Скопируйте содержимое `.sig` файлов в `updater.json`
4. Закоммитьте `updater.json` в main ветку

## 6. Проверка

Запустите старую версию приложения - через 5 секунд появится диалог обновления.

## Автоматизация через GitHub Actions

Добавьте в `.github/workflows/release.yml`:

```yaml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    strategy:
      matrix:
        platform: [macos-latest, windows-latest]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
        with:
          tagName: v__VERSION__
          releaseName: 'TS6 OverLive v__VERSION__'
          releaseBody: 'See CHANGELOG.md'
          releaseDraft: false
          prerelease: false
```

Добавьте секрет `TAURI_PRIVATE_KEY` в GitHub Settings → Secrets (содержимое `~/.tauri/myapp.key`).

## Примечания

- Обновления работают только в production сборках (не в dev режиме)
- Пользователи получат уведомление автоматически
- Можно отключить диалог: `"dialog": false` для тихих обновлений
- Проверка обновлений: при запуске + каждые 6 часов
