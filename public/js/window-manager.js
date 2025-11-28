class WindowManager {
    constructor() {
        this.appWindow = null;
    }

    async init() {
        if (!window.__TAURI__) return;
        this.appWindow = window.__TAURI__.window.appWindow;
    }

    async savePosition() {
        if (!this.appWindow) return;
        try {
            const pos = await this.appWindow.outerPosition();
            localStorage.setItem('window-position', JSON.stringify({ x: pos.x, y: pos.y }));
        } catch (e) {
            console.error('Save position failed:', e);
        }
    }

    async restorePosition() {
        if (!this.appWindow) return;
        try {
            const saved = localStorage.getItem('window-position');
            if (!saved) return;
            
            const pos = JSON.parse(saved);
            if (pos.x >= 0 && pos.y >= 0 && pos.x < 10000 && pos.y < 10000) {
                const { PhysicalPosition } = window.__TAURI__.window;
                await this.appWindow.setPosition(new PhysicalPosition(pos.x, pos.y));
            } else {
                localStorage.removeItem('window-position');
            }
        } catch (e) {
            console.error('Restore position failed:', e);
            localStorage.removeItem('window-position');
        }
    }

    async resize(width, height) {
        if (!this.appWindow) return;
        try {
            const { LogicalSize } = window.__TAURI__.window;
            await this.appWindow.setSize(new LogicalSize(Math.ceil(width), Math.ceil(height)));
        } catch (e) {
            console.error('Resize failed:', e);
        }
    }

    async show() {
        if (!this.appWindow) return;
        await this.appWindow.show();
    }

    async startDragging() {
        if (!this.appWindow) return;
        await this.appWindow.startDragging();
    }
}
