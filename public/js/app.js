class App {
    constructor() {
        this.ts6 = new TS6Client();
        this.windowManager = new WindowManager();
        this.settings = new Settings();
        this.ui = null;
    }

    async init() {
        await this.windowManager.init();
        this.settings.load();
        
        this.ui = new UI(this.settings, this.windowManager);
        this.ui.init();
        
        this.settings.onChange = () => this.ui.applySettings();
        this.ts6.onUpdate = () => this.ui.renderUsers(this.ts6.clients, this.ts6.isConnected);
        
        this.ui.renderUsers([], false);
        
        await this.ts6.connect();
        
        await this.ui.resizeWindow();
        await this.windowManager.restorePosition();
        await this.windowManager.show();
    }
}

window.toggleSettings = () => app.ui.toggleSettings();

const app = new App();
window.addEventListener('DOMContentLoaded', () => app.init());
