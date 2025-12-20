// Загрузка всех core модулей в правильном порядке
// Подключите этот файл в index.html перед другими скриптами

// 1. EventEmitter - базовый класс
// 2. Controllers - TS3 и TS6
// 3. Compatibility Adapter - для старого кода

// Использование:
// <script src="js/core/event-emitter.js"></script>
// <script src="js/core/ts3-controller.js"></script>
// <script src="js/core/ts6-controller.js"></script>
// <script src="js/core/compatibility-adapter.js"></script> <!-- опционально -->

console.log('[Core] Modules loaded');
