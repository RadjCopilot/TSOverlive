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
            const client = window.app.currentClient;
            if (client) {
                this.renderUsers(client.clients, client.isConnected, client.isConnectedToServer, client.channelName || '');
            }
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
        if (this._mutationObserver) {
            this._mutationObserver.disconnect();
        }
        let resizeTimeout = null;
        this._mutationObserver = new MutationObserver(() => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.resizeWindow(), 100);
        });
        this._mutationObserver.observe(this.userList, { childList: true, subtree: true });
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

    renderUsers(clients, isConnected, isConnectedToServer, channelName = '') {
        const tsName = this.settings.tsVersion === 'ts3' ? 'TS3' : 'TS6';
        
        let newHtml = '';
        
        if (!isConnected) {
            newHtml = `<div style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px; font-size: 12px;">Не подключено к ${tsName}</div>`;
        } else if (!isConnectedToServer) {
            newHtml = '<div style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px; font-size: 12px;">Нет подключения к серверу</div>';
        } else if (clients.length === 0) {
            newHtml = '<div style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px; font-size: 12px;">Нет пользователей в канале</div>';
        } else {
            const sorted = UserListService.sortAndLimit(clients, this.settings.maxUsers);
            const owner = UserListService.getOwner(sorted);
            const others = UserListService.getOthers(sorted);
            
            if (channelName) {
                newHtml += `<div class="channel-name">${channelName}</div>`;
            }
            
            if (owner) {
                newHtml += this._renderUser(owner);
                if (others.length > 0) {
                    newHtml += '<div class="user-separator"></div>';
                }
            }
            
            newHtml += others.map(user => this._renderUser(user)).join('');
        }
        
        if (this.userList.innerHTML !== newHtml) {
            this.userList.innerHTML = newHtml;
        }
    }

    _renderUser(user) {
        const icons = [];
        
        if (user.away) {
            icons.push('<svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><path d="M23,12H17V10L20.39,6H17V4H23V6L19.62,10H23V12M15,16H9V14L12.39,10H9V8H15V10L11.62,14H15V16M7,20H1V18L4.39,14H1V12H7V14L3.62,18H7V20Z"/></svg>');
        }
        
        if (user.inputMuted) {
            icons.push('<svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>');
        } else {
            icons.push('<svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V21h2v-3.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>');
        }
        
        if (user.outputMuted) {
            icons.push('<svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>');
        } else {
            icons.push('<svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>');
        }
        
        const statusIcons = icons.length > 0 ? `<span class="status-icons">${icons.join('')}</span>` : '';
        
        return `
            <div class="user-item ${user.isSpeaking ? 'speaking' : ''}">
                <div class="user-indicator"></div>
                <div class="user-name">${user.name}</div>
                ${statusIcons}
            </div>
        `;
    }
}
