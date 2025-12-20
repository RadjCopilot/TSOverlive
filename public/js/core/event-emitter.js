// Простой EventEmitter для event-driven архитектуры
class EventEmitter {
    constructor() {
        this._events = {};
    }

    on(event, handler) {
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(handler);
        return () => this.off(event, handler);
    }

    off(event, handler) {
        if (!this._events[event]) return;
        this._events[event] = this._events[event].filter(h => h !== handler);
    }

    emit(event, data) {
        if (!this._events[event]) return;
        this._events[event].forEach(handler => {
            try {
                handler(data);
            } catch (err) {
                console.error(`[EventEmitter] Error in ${event} handler:`, err);
            }
        });
    }

    once(event, handler) {
        const wrapper = (data) => {
            handler(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }
}
