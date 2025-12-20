class App {
    constructor() {
        this.ts6 = new TS6Client();
        this.ts3 = new TS3Client();
        this.currentClient = null;
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
        
        this.settings.onChange = (reconnect) => {
            this.ui.applySettings();
            if (reconnect) {
                this.switchTeamSpeakVersion();
            }
        };
        
        const updateCallback = () => {
            const client = this.currentClient;
            this.ui.renderUsers(client.clients, client.isConnected, client.isConnectedToServer, client.channelName || '');
        };
        
        this.ts6.onUpdate = updateCallback;
        this.ts3.onUpdate = updateCallback;
        
        this.ui.renderUsers([], false, false);
        
        this.switchTeamSpeakVersion();
        
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
            
            try {
                await register('CommandOrControl+Shift+T', toggleClickThrough);
            } catch (e) {
                console.log('[App] Hotkey already registered');
            }
            
            await invoke('update_click_through_menu', { enabled: this.settings.clickThrough });
            
            this.updater.startAutoCheck();
        }
    }

    switchTeamSpeakVersion() {
        const version = this.settings.tsVersion || 'ts6';
        
        if (this.currentClient) {
            this.currentClient.disconnect();
        }
        
        if (version === 'ts3') {
            this.currentClient = this.ts3;
            this.ts3.connect(this.settings.ts3ApiKey);
        } else {
            this.currentClient = this.ts6;
            this.ts6.connect();
        }
    }
}

window.toggleSettings = () => app?.ui?.toggleSettings();

const app = new App();
window.app = app;
window.addEventListener('DOMContentLoaded', () => app.init());
