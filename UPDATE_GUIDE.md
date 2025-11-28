# Руководство по настройке автообновлений

## Шаг 1: Создайте GitHub репозиторий

1. Создайте публичный репозиторий на GitHub (например, `TS6Overlay`)
2. Загрузите код проекта в репозиторий

## Шаг 2: Настройте package.json

В `package.json` замените `YOUR_GITHUB_USERNAME` на ваш GitHub username:

```json
"publish": [
  {
    "provider": "github",
    "owner": "ваш_username",
    "repo": "TS6Overlay"
  }
]
```

## Шаг 3: Создайте GitHub Token

1. Перейдите в GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Создайте новый token с правами `repo`
3. Скопируйте token

## Шаг 4: Настройте переменную окружения

### macOS/Linux:
```bash
export GH_TOKEN="ваш_github_token"
```

### Windows:
```cmd
set GH_TOKEN=ваш_github_token
```

## Шаг 5: Соберите и опубликуйте релиз

```bash
# Увеличьте версию в package.json (например, с 1.0.0 на 1.0.1)
npm version patch

# Соберите и опубликуйте
npm run dist
```

Это автоматически:
- Соберет приложение для вашей платформы
- Создаст GitHub Release
- Загрузит установочные файлы

## Шаг 6: Публикация для обеих платформ

### Для macOS:
```bash
npm run dist:mac
```

### Для Windows:
```bash
npm run dist:win
```

## Как работают обновления

1. При запуске приложение проверяет GitHub Releases на наличие новой версии
2. Если найдена новая версия, пользователь получает уведомление
3. Обновление скачивается и устанавливается автоматически
4. Проверка обновлений происходит каждый час

## Альтернативные провайдеры

Вместо GitHub можно использовать:

### Amazon S3:
```json
"publish": {
  "provider": "s3",
  "bucket": "your-bucket"
}
```

### Generic HTTP Server:
```json
"publish": {
  "provider": "generic",
  "url": "https://your-server.com/updates"
}
```

## Тестирование обновлений

1. Соберите версию 1.0.0 и установите
2. Увеличьте версию до 1.0.1
3. Соберите и опубликуйте новую версию
4. Запустите старую версию - она должна предложить обновление

## Отключение автообновлений в dev режиме

Автообновления автоматически отключены в режиме разработки (`npm run dev`).
