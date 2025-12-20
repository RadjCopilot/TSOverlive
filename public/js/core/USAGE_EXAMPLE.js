// Пример использования нового API в стиле Telegram Bot

// Получаем синглтон контроллеры
const ts3 = TS3Controller.getInstance();
const ts6 = TS6Controller.getInstance();

// ============= TS3 События =============

// Подключение к ClientQuery
ts3.on('connected', () => {
    console.log('TS3 ClientQuery connected');
});

// Подключение к серверу TS3
ts3.on('server-connected', () => {
    console.log('Connected to TS3 server');
});

// Отключение от сервера
ts3.on('server-disconnected', () => {
    console.log('Disconnected from TS3 server');
    updateUI();
});

// Получена информация о себе
ts3.on('whoami', ({ clientId, channelId }) => {
    console.log(`I am client ${clientId} in channel ${channelId}`);
});

// Список каналов загружен
ts3.on('channels-loaded', (channels) => {
    console.log('Channels:', channels);
});

// Список клиентов обновлён
ts3.on('clients-updated', (clients) => {
    console.log('Clients updated:', clients);
    updateUI();
});

// Клиент вошёл в канал
ts3.on('client-enter', (client) => {
    console.log(`${client.name} entered the channel`);
    updateUI();
});

// Клиент покинул канал
ts3.on('client-leave', (client) => {
    console.log(`${client.name} left the channel`);
    updateUI();
});

// Клиент переместился из канала
ts3.on('client-moved-out', (client) => {
    console.log(`${client.name} moved to another channel`);
    updateUI();
});

// Я переместился в другой канал
ts3.on('self-moved', ({ channelId, channelName }) => {
    console.log(`I moved to ${channelName}`);
    updateUI();
});

// Статус разговора изменился
ts3.on('talk-status', ({ client, isSpeaking }) => {
    console.log(`${client.name} is ${isSpeaking ? 'speaking' : 'silent'}`);
    updateUI();
});

// Клиент обновлён (имя, мут и т.д.)
ts3.on('client-updated', (client) => {
    console.log(`${client.name} updated`);
    updateUI();
});

// Микрофон включён/выключен
ts3.on('mute-toggled', (isMuted) => {
    console.log(`Microphone ${isMuted ? 'muted' : 'unmuted'}`);
});

// ============= TS6 События =============

// Подключение к Remote App API
ts6.on('connected', () => {
    console.log('TS6 Remote App connected');
});

// Подключение к серверу TS6
ts6.on('server-connected', () => {
    console.log('Connected to TS6 server');
});

// Отключение от сервера
ts6.on('server-disconnected', () => {
    console.log('Disconnected from TS6 server');
    updateUI();
});

// Получена информация о себе
ts6.on('whoami', ({ clientId, channelId }) => {
    console.log(`I am client ${clientId} in channel ${channelId}`);
});

// Список клиентов обновлён
ts6.on('clients-updated', (clients) => {
    console.log('Clients updated:', clients);
    updateUI();
});

// Клиент переместился из канала
ts6.on('client-moved-out', (client) => {
    console.log(`${client.name} moved to another channel`);
    updateUI();
});

// Я переместился в другой канал
ts6.on('self-moved', ({ channelId }) => {
    console.log(`I moved to channel ${channelId}`);
    updateUI();
});

// Статус разговора изменился
ts6.on('talk-status', ({ client, isSpeaking }) => {
    console.log(`${client.name} is ${isSpeaking ? 'speaking' : 'silent'}`);
    updateUI();
});

// Клиент обновлён
ts6.on('client-updated', (client) => {
    console.log(`${client.name} updated`);
    updateUI();
});

// Микрофон включён/выключен
ts6.on('mute-toggled', (isMuted) => {
    console.log(`Microphone ${isMuted ? 'muted' : 'unmuted'}`);
});

// ============= Методы =============

// Подключение
async function connectToTS3() {
    const apiKey = localStorage.getItem('ts3-api-key') || '';
    await ts3.connect(apiKey);
}

async function connectToTS6() {
    await ts6.connect();
}

// Получение данных
function getClients() {
    const clients = ts3.isReady() ? ts3.getClients() : ts6.getClients();
    return clients;
}

function getMyClient() {
    return ts3.isReady() ? ts3.getMyClient() : ts6.getMyClient();
}

function getChannelName() {
    return ts3.isReady() ? ts3.getChannelName() : ts6.getChannelName();
}

// Управление
async function toggleMute() {
    if (ts3.isReady()) {
        await ts3.toggleMute();
    } else if (ts6.isReady()) {
        await ts6.toggleMute();
    }
}

// Проверка готовности
function isReady() {
    return ts3.isReady() || ts6.isReady();
}

// ============= Отписка от событий =============

// Можно отписаться от события
const unsubscribe = ts3.on('client-enter', (client) => {
    console.log('New client:', client);
});

// Позже отписаться
unsubscribe();

// Или через off
function handleClientEnter(client) {
    console.log('Client entered:', client);
}

ts3.on('client-enter', handleClientEnter);
ts3.off('client-enter', handleClientEnter);

// Подписка на одно событие (once)
ts3.once('connected', () => {
    console.log('Connected once!');
});

// ============= Обновление UI =============

function updateUI() {
    const clients = getClients();
    const channelName = getChannelName();
    
    // Обновляем интерфейс
    document.getElementById('channel-name').textContent = channelName;
    
    const userList = document.getElementById('user-list');
    userList.innerHTML = '';
    
    clients.forEach(client => {
        const div = document.createElement('div');
        div.className = `user ${client.isSpeaking ? 'speaking' : ''}`;
        div.textContent = client.name;
        userList.appendChild(div);
    });
}
