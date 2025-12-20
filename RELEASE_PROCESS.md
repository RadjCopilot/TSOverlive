# Инструкция по выкатке обновления v1.1.0

## Подготовка к релизу

### 1. Проверка версий
Убедитесь, что версия обновлена во всех файлах:
- ✅ `package.json` → `"version": "1.1.0"`
- ✅ `src-tauri/tauri.conf.json` → `"version": "1.1.0"`
- ✅ `CHANGELOG.md` → добавлен раздел `[1.1.0]`
- ✅ `RELEASE_NOTES_v1.1.0.md` → создан

### 2. Тестирование
```bash
# Запустите в dev режиме
npm run dev

# Проверьте все новые функции:
# - Кнопка мута работает
# - Сортировка пользователей корректна
# - Обновление никнеймов работает
# - Нет переподключений при изменении настроек
```

### 3. Сборка для обеих платформ

#### macOS (Universal Binary):
```bash
npm run build:mac
```
Результат: `src-tauri/target/universal-apple-darwin/release/bundle/dmg/TeamSpeak OverLive_1.1.0_universal.dmg`

#### Windows:
```bash
npm run build:win
```
Результат: `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/TeamSpeak OverLive_1.1.0_x64_en-US.msi`

## Публикация релиза

### Вариант 1: Через GitHub Actions (Рекомендуется)

1. **Создайте и запушьте тег:**
```bash
git add .
git commit -m "Release v1.1.0"
git tag v1.1.0
git push origin main
git push origin v1.1.0
```

2. **GitHub Actions автоматически:**
   - Соберет приложение для macOS и Windows
   - Создаст GitHub Release
   - Загрузит установочные файлы
   - Обновит `updater.json`

3. **Проверьте релиз:**
   - Перейдите в `Releases` на GitHub
   - Убедитесь, что релиз создан с правильными файлами

### Вариант 2: Ручная публикация

1. **Соберите приложения локально** (см. шаг 3 выше)

2. **Создайте GitHub Release:**
   - Перейдите в `Releases` → `Draft a new release`
   - Tag: `v1.1.0`
   - Title: `TeamSpeak OverLive v1.1.0`
   - Description: Скопируйте содержимое из `RELEASE_NOTES_v1.1.0.md`

3. **Загрузите файлы:**
   - `TeamSpeak OverLive_1.1.0_universal.dmg` (macOS)
   - `TeamSpeak OverLive_1.1.0_x64_en-US.msi` (Windows)
   - `TeamSpeak OverLive_1.1.0_universal.dmg.tar.gz` (для updater)
   - `TeamSpeak OverLive_1.1.0_universal.dmg.tar.gz.sig` (подпись)

4. **Обновите updater.json:**
```json
{
  "version": "1.1.0",
  "notes": "См. RELEASE_NOTES_v1.1.0.md",
  "pub_date": "2025-01-XX",
  "platforms": {
    "darwin-universal": {
      "signature": "содержимое .sig файла",
      "url": "https://github.com/YOUR_USERNAME/TS6Overlay/releases/download/v1.1.0/TeamSpeak.OverLive_1.1.0_universal.dmg.tar.gz"
    },
    "windows-x86_64": {
      "signature": "содержимое .sig файла",
      "url": "https://github.com/YOUR_USERNAME/TS6Overlay/releases/download/v1.1.0/TeamSpeak.OverLive_1.1.0_x64_en-US.msi.zip"
    }
  }
}
```

5. **Опубликуйте релиз** (снимите галочку "Draft")

## Проверка автообновления

### Тестирование на macOS:
1. Установите версию 1.0.1
2. Запустите приложение
3. Через ~1 минуту должно появиться уведомление об обновлении
4. Нажмите "Update" и дождитесь установки
5. Проверьте, что версия обновилась до 1.1.0

### Тестирование на Windows:
1. Установите версию 1.0.1
2. Запустите приложение
3. Через ~1 минуту должно появиться уведомление об обновлении
4. Нажмите "Update" и дождитесь установки
5. Проверьте, что версия обновилась до 1.1.0

## Откат релиза (если что-то пошло не так)

1. **Удалите тег:**
```bash
git tag -d v1.1.0
git push origin :refs/tags/v1.1.0
```

2. **Удалите GitHub Release:**
   - Перейдите в релиз
   - Нажмите "Delete"

3. **Исправьте проблемы и повторите процесс**

## Уведомление пользователей

После успешной публикации:
1. Создайте пост в Discord/Telegram/форуме
2. Опишите основные изменения
3. Укажите ссылку на release notes
4. Упомяните, что обновление установится автоматически

## Мониторинг

После релиза следите за:
- GitHub Issues (новые баги)
- Статистика скачиваний в Releases
- Логи автообновлений (если настроены)

## Чеклист перед релизом

- [ ] Версии обновлены во всех файлах
- [ ] CHANGELOG.md обновлен
- [ ] Release notes созданы
- [ ] Приложение протестировано
- [ ] Сборки для обеих платформ готовы
- [ ] GitHub Release создан
- [ ] updater.json обновлен
- [ ] Автообновление протестировано
- [ ] Пользователи уведомлены

---

**Важно:** Всегда тестируйте автообновление перед публикацией релиза!
