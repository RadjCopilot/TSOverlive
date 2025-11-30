# Как создать релиз

## Шаг 1: Добавить секрет в GitHub

1. Откройте ваш репозиторий на GitHub
2. Settings → Secrets and variables → Actions
3. Нажмите "New repository secret"
4. Name: `TAURI_PRIVATE_KEY`
5. Value: `LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1DNENBUUF3QlFZREsyVndCQ0lFSUg3a0NQc1ZYakc0dnYyYVVRWXBSUHd2L2NJVlJWZHRoSENQZmY1V0ZDZUsKLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLQo=`
6. Нажмите "Add secret"

## Шаг 2: Закоммитить изменения

```bash
git add .
git commit -m "v1.0.1: Исправления трея и виджета"
git push origin main
```

## Шаг 3: Создать тег

```bash
git tag v1.0.1
git push origin v1.0.1
```

## Шаг 4: Дождаться сборки

1. Откройте GitHub → Actions
2. Дождитесь завершения workflow "Release"
3. Это займет ~10-15 минут

## Шаг 5: Обновить updater.json

После завершения сборки:

1. Откройте GitHub → Releases → v1.0.1
2. Скачайте файлы `.sig`:
   - `TS6.OverLive.app.tar.gz.sig` (macOS)
   - `TS6.OverLive_1.0.1_x64_en-US.msi.zip.sig` (Windows)
3. Откройте их в текстовом редакторе
4. Скопируйте содержимое в `updater.json`:

```json
{
  "version": "1.0.1",
  "notes": "Исправления:\n- Иконка в трее теперь всегда видна\n- Виджет не прячется автоматически\n- Клик по трею не скрывает виджет",
  "pub_date": "2025-11-30T16:00:00Z",
  "platforms": {
    "darwin-universal": {
      "signature": "СОДЕРЖИМОЕ_TS6.OverLive.app.tar.gz.sig",
      "url": "https://github.com/RadjCopilot/TS6Overlay/releases/download/v1.0.1/TS6.OverLive.app.tar.gz"
    },
    "windows-x86_64": {
      "signature": "СОДЕРЖИМОЕ_.msi.zip.sig",
      "url": "https://github.com/RadjCopilot/TS6Overlay/releases/download/v1.0.1/TS6.OverLive_1.0.1_x64_en-US.msi.zip"
    }
  }
}
```

5. Закоммитьте `updater.json`:

```bash
git add updater.json
git commit -m "Update updater.json for v1.0.1"
git push origin main
```

## Готово!

Все пользователи с версией 1.0.0 получат уведомление об обновлении через 5 секунд после запуска приложения.

## Быстрая команда (все в одном)

```bash
# Обновить версию, закоммитить и создать тег
git add .
git commit -m "v1.0.1: Исправления трея и виджета"
git push origin main
git tag v1.0.1
git push origin v1.0.1

# Дождаться сборки на GitHub Actions
# Затем обновить updater.json с подписями
```

## Проверка

Запустите старую версию приложения - через 5 секунд появится диалог:

```
Доступно обновление 1.0.1

Исправления:
- Иконка в трее теперь всегда видна
- Виджет не прячется автоматически
- Клик по трею не скрывает виджет

Установить сейчас?
```
