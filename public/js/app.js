class App {
    constructor() {
        this.ts6 = new TS6Client();
        this.windowManager = new WindowManager();
        this.settings = new Settings();
        this.ui = null;
        this.updater = new Updater();
    }

    async init() {
        await this.windowManager.init();
        this.settings.load();
        
        this.ui = new UI(this.settings, this.windowManager);
        this.ui.init();
        
        this.settings.onChange = () => this.ui.applySettings();
        this.ts6.onUpdate = () => this.ui.renderUsers(this.ts6.clients, this.ts6.isConnected, this.ts6.isConnectedToServer);
        
        this.ui.renderUsers([], false, false);
        
        await this.ts6.connect();
        
        await this.ui.resizeWindow();
        await this.windowManager.restorePosition();
        await this.windowManager.show();
        
        if (window.__TAURI__) {
            const { listen } = window.__TAURI__.event;
            const { register } = window.__TAURI__.globalShortcut;
            const { appWindow } = window.__TAURI__.window;
            const { invoke } = window.__TAURI__.tauri;
            
            const toggleClickThrough = async () => {
                const newValue = !this.settings.clickThrough;
                this.settings.setClickThrough(newValue);
                await appWindow.setIgnoreCursorEvents(newValue);
                await invoke('update_click_through_menu', { enabled: newValue });
                document.getElementById('clickThrough').checked = newValue;
            };
            
            await listen('toggle-click-through', toggleClickThrough);
            await register('CommandOrControl+Shift+T', toggleClickThrough);
            
            await invoke('update_click_through_menu', { enabled: this.settings.clickThrough });
            
            this.updater.startAutoCheck();
        }
    }
}

window.toggleSettings = () => app.ui.toggleSettings();

const app = new App();
window.addEventListener('DOMContentLoaded', () => app.init());
