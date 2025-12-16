# Интеграция с TeamSpeak 3

## Что добавлено

Приложение теперь поддерживает работу как с TeamSpeak 6, так и с TeamSpeak 3.

## Как это работает

### TeamSpeak 6
- Использует Remote App API через WebSocket (порт 5899)
- Требует разрешение при первом подключении

### TeamSpeak 3
- Использует ClientQuery API через WebSocket (порт 25639)
- Требует включения ClientQuery в настройках TS3

## Переключение между версиями

1. Откройте настройки виджета (⚙️)
2. Выберите нужную версию в выпадающем списке "Версия TeamSpeak"
3. Виджет автоматически переподключится

## Настройка TeamSpeak 3

См. подробную инструкцию в `TS3_SETUP.md`

## Технические детали

### Файлы
- `public/js/ts3-client.js` - клиент для TS3 ClientQuery API
- `public/js/ts6-client.js` - клиент для TS6 Remote App API
- `public/js/app.js` - переключение между версиями

### API TeamSpeak 3
Используемые команды:
- `auth` - авторизация
- `clientnotifyregister` - подписка на события
- `whoami` - получение информации о текущем клиенте
- `clientlist` - список клиентов

Обрабатываемые события:
- `notifycliententerview` - пользователь зашел
- `notifyclientleftview` - пользователь вышел
- `notifytalkstatuschange` - изменение статуса говорения
- `notifyclientmoved` - перемещение пользователя
