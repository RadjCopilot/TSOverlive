class UI {
    constructor(settings, windowManager) {
        this.settings = settings;
        this.windowManager = windowManager;
        this.overlay = document.getElementById('overlay');
        this.userList = document.getElementById('userList');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.isDragging = false;
    }

    init() {
        this._bindSettings();
        this._bindDragging();
        this._bindHover();
        this._observeChanges();
        this.applySettings();
    }

    _bindSettings() {
        document.getElementById('opacity').addEventListener('input', (e) => {
            document.getElementById('opacityValue').textContent = e.target.value;
            this.settings.setOpacity(parseInt(e.target.value));
        });

        document.getElementById('minimal').addEventListener('change', (e) => {
            this.settings.setMinimal(e.target.checked);
        });

        document.getElementById('maxUsers').addEventListener('change', (e) => {
            this.settings.setMaxUsers(parseInt(e.target.value));
        });

        document.getElementById('color').addEventListener('input', (e) => {
            const color = e.target.value;
            document.getElementById('colorPreview').style.background = color;
            this.settings.setColor(color);
        });

        document.getElementById('clickThrough').addEventListener('change', async (e) => {
            this.settings.setClickThrough(e.target.checked);
            if (window.__TAURI__) {
                const { invoke } = window.__TAURI__.tauri;
                await invoke('update_click_through_menu', { enabled: e.target.checked });
            }
        });

        document.getElementById('tsVersion').addEventListener('change', (e) => {
            this.settings.setTsVersion(e.target.value);
            this._updateVersionUI();
        });

        document.getElementById('ts3TokenEdit').addEventListener('click', () => {
            document.getElementById('ts3TokenDisplay').style.display = 'none';
            document.getElementById('ts3TokenInput').style.display = 'block';
            document.getElementById('ts3Token').value = this.settings.ts3ApiKey;
            document.getElementById('ts3Token').focus();
        });

        document.getElementById('ts3TokenApply').addEventListener('click', () => {
            const token = document.getElementById('ts3Token').value.trim();
            this.settings.setTs3ApiKey(token);
            this._updateVersionUI();
        });
    }

    _updateVersionUI() {
        const ts3Warning = document.getElementById('ts3Warning');
        const ts3TokenGroup = document.getElementById('ts3TokenGroup');
        const ts3TokenDisplay = document.getElementById('ts3TokenDisplay');
        const ts3TokenInput = document.getElementById('ts3TokenInput');
        
        if (this.settings.tsVersion === 'ts3') {
            ts3Warning.style.display = 'block';
            ts3TokenGroup.style.display = 'block';
            
            if (this.settings.ts3ApiKey) {
                const masked = this.settings.ts3ApiKey.substring(0, 8) + '...' + this.settings.ts3ApiKey.substring(this.settings.ts3ApiKey.length - 4);
                document.getElementById('ts3TokenMasked').value = masked;
                ts3TokenDisplay.style.display = 'block';
                ts3TokenInput.style.display = 'none';
            } else {
                ts3TokenDisplay.style.display = 'none';
                ts3TokenInput.style.display = 'block';
            }
        } else {
            ts3Warning.style.display = 'none';
            ts3TokenGroup.style.display = 'none';
        }
    }

    _bindDragging() {
        document.querySelector('.container').addEventListener('mousedown', async (e) => {
            if (e.target.closest('.settings-btn') || e.target.closest('.settings-panel')) return;
            this.isDragging = true;
            this.overlay.classList.add('dragging');
            await this.windowManager.startDragging();
            this.overlay.classList.remove('dragging');
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                setTimeout(() => this.windowManager.savePosition(), 50);
            }
        });
    }

    _bindHover() {
        const header = document.querySelector('.header');
        this.overlay.addEventListener('mouseenter', () => header.classList.add('visible'));
        this.overlay.addEventListener('mouseleave', () => header.classList.remove('visible'));
        header.addEventListener('mouseenter', () => header.classList.add('visible'));
        header.addEventListener('mouseleave', () => header.classList.remove('visible'));
    }

    _observeChanges() {
        new MutationObserver(() => {
            setTimeout(() => this.resizeWindow(), 50);
        }).observe(this.userList, { childList: true, subtree: true });
    }

    toggleSettings() {
        const isOpening = !this.settingsPanel.classList.contains('visible');
        this.settingsPanel.classList.toggle('visible');
        
        if (window.__TAURI__) {
            const { appWindow } = window.__TAURI__.window;
            if (isOpening) {
                appWindow.setIgnoreCursorEvents(false);
            } else {
                setTimeout(() => {
                    appWindow.setIgnoreCursorEvents(this.settings.clickThrough);
                }, 100);
            }
        }
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => this.resizeWindow());
        });
    }

    applySettings() {
        const opacity = this.settings.opacity / 100;
        const color = this.settings.color;
        
        this.overlay.classList.toggle('minimal', this.settings.minimal);
        this.overlay.style.background = `rgba(20, 20, 20, ${opacity})`;
        this.overlay.style.boxShadow = opacity > 0 ? `inset 0 0 0 1px rgba(255, 255, 255, ${0.1 * opacity})` : 'none';
        
        document.documentElement.style.setProperty('--accent-color', color);
        
        document.getElementById('opacity').value = this.settings.opacity;
        document.getElementById('opacityValue').textContent = this.settings.opacity;
        document.getElementById('minimal').checked = this.settings.minimal;
        document.getElementById('maxUsers').value = this.settings.maxUsers;
        document.getElementById('color').value = color;
        document.getElementById('colorPreview').style.background = color;
        document.getElementById('clickThrough').checked = this.settings.clickThrough;
        document.getElementById('tsVersion').value = this.settings.tsVersion;
        this._updateVersionUI();
        
        if (window.__TAURI__ && !this.settingsPanel.classList.contains('visible')) {
            const { appWindow } = window.__TAURI__.window;
            appWindow.setIgnoreCursorEvents(this.settings.clickThrough);
        }
        
        setTimeout(() => this.resizeWindow(), 100);
    }

    async resizeWindow() {
        const overlayRect = this.overlay.getBoundingClientRect();
        let width = overlayRect.width;
        let height = overlayRect.height;
        
        if (this.settingsPanel.classList.contains('visible')) {
            const panelRect = this.settingsPanel.getBoundingClientRect();
            width = overlayRect.width + 10 + panelRect.width;
            height = Math.max(overlayRect.height, panelRect.height);
        }
        
        await this.windowManager.resize(width, height);
    }

    renderUsers(clients, isConnected, isConnectedToServer) {
        const tsName = this.settings.tsVersion === 'ts3' ? 'TS3' : 'TS6';
        if (!isConnected) {
            this.userList.innerHTML = `<div style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px; font-size: 12px;">Не подключено к ${tsName}</div>`;
            return;
        }
        
        if (!isConnectedToServer) {
            this.userList.innerHTML = '<div style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px; font-size: 12px;">Нет подключения к серверу</div>';
            return;
        }
        
        if (clients.length === 0) {
            this.userList.innerHTML = '<div style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px; font-size: 12px;">Нет пользователей в канале</div>';
            return;
        }
        
        // Разделяем на себя и остальных
        const me = clients.filter(c => c.isMe);
        const others = clients.filter(c => !c.isMe);
        
        // Сортируем остальных по говорению
        const sortedOthers = others.sort((a, b) => (b.isSpeaking ? 1 : 0) - (a.isSpeaking ? 1 : 0));
        
        // Себя всегда первым, потом остальные
        const sorted = [...me, ...sortedOthers];
        const limited = sorted.slice(0, this.settings.maxUsers);
        
        this.userList.innerHTML = limited.map(user => `
            <div class="user-item ${user.isSpeaking ? 'speaking' : ''}">
                <div class="user-indicator"></div>
                <span class="user-name">${user.name}${user.isMe ? ' (вы)' : ''}</span>
            </div>
        `).join('');
    }
}
