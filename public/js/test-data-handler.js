// Тест для проверки логики TS6DataHandler
// Запустить в консоли браузера после загрузки страницы

function testTS6DataHandler() {
    console.log('=== Тест TS6DataHandler ===');
    
    const handler = new TS6DataHandler();
    let updateCount = 0;
    
    handler.onUpdate = () => {
        updateCount++;
        console.log(`Update #${updateCount}`);
    };
    
    // Тест 1: Добавление соединения
    console.log('\n1. Добавление соединения');
    handler.addConnection({ id: 1, clientId: 100 });
    console.assert(handler.connections.length === 1, 'Должно быть 1 соединение');
    console.assert(updateCount === 1, 'Должно быть 1 обновление');
    
    // Тест 2: Дубликат соединения не добавляется
    console.log('\n2. Дубликат соединения');
    handler.addConnection({ id: 1, clientId: 100 });
    console.assert(handler.connections.length === 1, 'Должно остаться 1 соединение');
    console.assert(updateCount === 1, 'Не должно быть нового обновления');
    
    // Тест 3: Добавление канала
    console.log('\n3. Добавление канала');
    handler.addChannel({ id: 10, connectionId: 1, name: 'Test Channel' });
    console.assert(handler.channels.length === 1, 'Должен быть 1 канал');
    console.assert(updateCount === 2, 'Должно быть 2 обновления');
    
    // Тест 4: Добавление клиента
    console.log('\n4. Добавление клиента');
    handler.addClient({ 
        id: 200, 
        connectionId: 1, 
        channelId: 10, 
        name: 'User1',
        isSpeaking: false 
    });
    console.assert(handler.clients.length === 1, 'Должен быть 1 клиент');
    console.assert(updateCount === 3, 'Должно быть 3 обновления');
    
    // Тест 5: Обновление клиента
    console.log('\n5. Обновление клиента');
    handler.updateClient({ 
        id: 200, 
        connectionId: 1, 
        channelId: 10, 
        name: 'User1',
        isSpeaking: true 
    });
    const client = handler.getClientById(200, 1);
    console.assert(client.isSpeaking === true, 'Клиент должен говорить');
    console.assert(updateCount === 4, 'Должно быть 4 обновления');
    
    // Тест 6: Добавление второго клиента
    console.log('\n6. Добавление второго клиента');
    handler.addClient({ 
        id: 201, 
        connectionId: 1, 
        channelId: 10, 
        name: 'User2',
        isSpeaking: false 
    });
    console.assert(handler.clients.length === 2, 'Должно быть 2 клиента');
    
    // Тест 7: Получение клиентов в канале
    console.log('\n7. Получение клиентов в канале');
    const clientsInChannel = handler.getClientsInChannel(10, 1);
    console.assert(clientsInChannel.length === 2, 'В канале должно быть 2 клиента');
    
    // Тест 8: Удаление клиента
    console.log('\n8. Удаление клиента');
    handler.removeClient(201, 1);
    console.assert(handler.clients.length === 1, 'Должен остаться 1 клиент');
    
    // Тест 9: Каскадное удаление при удалении соединения
    console.log('\n9. Каскадное удаление соединения');
    handler.addClient({ 
        id: 202, 
        connectionId: 1, 
        channelId: 10, 
        name: 'User3',
        isSpeaking: false 
    });
    console.assert(handler.clients.length === 2, 'Должно быть 2 клиента перед удалением');
    
    handler.removeConnection(1);
    console.assert(handler.connections.length === 0, 'Не должно быть соединений');
    console.assert(handler.channels.length === 0, 'Не должно быть каналов');
    console.assert(handler.clients.length === 0, 'Не должно быть клиентов');
    
    // Тест 10: clearAll
    console.log('\n10. Очистка всех данных');
    handler.addConnection({ id: 2, clientId: 101 });
    handler.addChannel({ id: 20, connectionId: 2, name: 'Channel 2' });
    handler.addClient({ id: 300, connectionId: 2, channelId: 20, name: 'User4' });
    
    handler.clearAll();
    console.assert(handler.connections.length === 0, 'Все соединения должны быть удалены');
    console.assert(handler.channels.length === 0, 'Все каналы должны быть удалены');
    console.assert(handler.clients.length === 0, 'Все клиенты должны быть удалены');
    
    console.log('\n✅ Все тесты пройдены!');
    console.log(`Всего обновлений: ${updateCount}`);
}

// Запустить тест
// testTS6DataHandler();
