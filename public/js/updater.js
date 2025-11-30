class Updater {
    constructor() {
        this.checking = false;
    }

    async checkForUpdates() {
        if (this.checking || !window.__TAURI__) return;
        
        this.checking = true;
        try {
            const { checkUpdate, installUpdate } = window.__TAURI__.updater;
            const { relaunch } = window.__TAURI__.process;
            
            const update = await checkUpdate();
            
            if (update.shouldUpdate) {
                console.log(`Update available: ${update.manifest.version}`);
                
                const shouldInstall = confirm(
                    `Доступно обновление ${update.manifest.version}\n\n` +
                    `${update.manifest.body}\n\n` +
                    `Установить сейчас?`
                );
                
                if (shouldInstall) {
                    await installUpdate();
                    await relaunch();
                }
            }
        } catch (error) {
            console.error('Update check failed:', error);
        } finally {
            this.checking = false;
        }
    }

    startAutoCheck() {
        // Проверка при запуске
        setTimeout(() => this.checkForUpdates(), 5000);
        
        // Проверка каждые 6 часов
        setInterval(() => this.checkForUpdates(), 6 * 60 * 60 * 1000);
    }
}
