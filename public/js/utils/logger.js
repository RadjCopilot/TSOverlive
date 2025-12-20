// Logger utility для записи логов
class Logger {
    static logs = [];
    static maxLogs = 1000;
    
    static log(message, data = null) {
        const timestamp = new Date().toISOString();
        const logMessage = data ? `${message} ${JSON.stringify(data)}` : message;
        const fullLog = `[${timestamp}] ${logMessage}`;
        
        console.log(fullLog);
        
        this.logs.push(fullLog);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // Сохраняем в localStorage
        try {
            localStorage.setItem('ts6-logs', JSON.stringify(this.logs));
        } catch (e) {
            // Если переполнение - очищаем старые
            this.logs = this.logs.slice(-500);
            localStorage.setItem('ts6-logs', JSON.stringify(this.logs));
        }
    }
    
    static logTS6Message(msg) {
        this.log('[TS6-RAW]', msg);
    }
    
    static getLogs() {
        return this.logs.join('\n');
    }
    
    static downloadLogs() {
        const logs = this.getLogs();
        console.log('=== LOGS START ===');
        console.log(logs);
        console.log('=== LOGS END ===');
        alert('Логи выведены в консоль DevTools. Скопируйте их оттуда.');
    }
    
    static clearLogs() {
        this.logs = [];
        localStorage.removeItem('ts6-logs');
    }
}
