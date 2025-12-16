class TS3Client {
    constructor() {
        this.clients = [];
        this.currentChannel = null;
        this.isConnected = false;
        this.isConnectedToServer = false;
        this.onUpdate = null;
        this.socket = null;
        this.reconnectTimer = null;
        this.myClientId = null;
        this.apiKey = '';
        this.listenersRegistered = false;
    }

    async connect(apiKey = '') {
        if (!window.__TAURI__) return;
        
        this.apiKey = apiKey;
        const { invoke } = window.__TAURI__.tauri;
        const { listen } = window.__TAURI__.event;
        
        if (!this.listenersRegistered) {
            console.log('[TS3] Registering event listeners');
            
            await listen('ts3-connected', async () => {
                console.log('[TS3] ClientQuery connected');
                this.isConnected = true;
                
                if (this.apiKey) {
                    console.log('[TS3] Authenticating with API key');
                    await this._sendCommand(`auth apikey=${this.apiKey}`);
                } else {
                    console.log('[TS3] Authenticating without API key');
                    await this._sendCommand('auth');
                }
                
                await new Promise(resolve => setTimeout(resolve, 200));
                await this._sendCommand('use 1');
                
                await new Promise(resolve => setTimeout(resolve, 200));
                await this._sendCommand('clientnotifyregister schandlerid=1 event=any');
                
                await new Promise(resolve => setTimeout(resolve, 200));
                await this._sendCommand('whoami');
                
                await new Promise(resolve => setTimeout(resolve, 200));
                await this._sendCommand('clientlist');
            });
            
            await listen('ts3-message', (e) => {
                this._handleMessage(e.payload);
            });
            
            await listen('ts3-disconnected', () => {
                console.log('[TS3] ClientQuery disconnected');
                this.isConnected = false;
                this.isConnectedToServer = false;
                this.clients = [];
                this.myClientId = null;
                this.currentChannel = null;
                if (this.onUpdate) this.onUpdate();
            });
            
            this.listenersRegistered = true;
        }
        
        console.log('[TS3] Invoking connect_ts3');
        await invoke('connect_ts3');
    }

    async _sendCommand(cmd) {
        if (window.__TAURI__) {
            const { invoke } = window.__TAURI__.tauri;
            await invoke('send_ts3_command', { command: cmd });
        }
    }

    _handleMessage(data) {
        console.log('[TS3] Raw:', data);
        const lines = data.trim().split('\n');
        
        for (const line of lines) {
            if (line.includes('error id=1796') || line.includes('error id=1794')) {
                console.log('[TS3] Not connected to server (error 1796/1794)');
                this.isConnectedToServer = false;
                this.clients = [];
                this.myClientId = null;
                this.currentChannel = null;
                if (this.onUpdate) this.onUpdate();
            } else if (line.includes('error id=0')) {
                console.log('[TS3] Command OK');
            } else if (line.startsWith('notifyconnectstatuschange')) {
                this._handleConnectStatus(line);
            } else if (line.startsWith('notifycliententerview')) {
                this._handleClientEnter(line);
            } else if (line.startsWith('notifyclientleftview')) {
                this._handleClientLeft(line);
            } else if (line.startsWith('notifytalkstatuschange')) {
                this._handleTalkStatus(line);
            } else if (line.startsWith('notifyclientmoved')) {
                this._handleClientMoved(line);
            } else if (line.includes('clid=') && line.includes('client_nickname=')) {
                this._handleClientList(line);
            } else if (line.includes('clid=') && line.includes('cid=') && !line.includes('client_nickname=')) {
                this._handleWhoAmI(line);
            }
        }
    }

    _parseParams(line) {
        const params = {};
        const parts = line.split(' ');
        for (const part of parts) {
            const [key, value] = part.split('=');
            if (key && value) {
                params[key] = decodeURIComponent(value.replace(/\\s/g, ' '));
            }
        }
        return params;
    }

    _handleConnectStatus(line) {
        const params = this._parseParams(line);
        const status = params.status;
        
        console.log('[TS3] Connect status:', status);
        
        if (status === 'disconnected' || status === '0') {
            console.log('[TS3] Disconnected from server');
            this.isConnectedToServer = false;
            this.clients = [];
            this.myClientId = null;
            this.currentChannel = null;
            if (this.onUpdate) this.onUpdate();
        } else if (status === 'connected' || status === '1') {
            console.log('[TS3] Connected to server');
            this.isConnectedToServer = true;
            // Запрашиваем информацию о себе
            setTimeout(() => {
                this._sendCommand('whoami');
                this._sendCommand('clientlist');
            }, 500);
        }
    }

    _handleWhoAmI(line) {
        const params = this._parseParams(line);
        this.myClientId = parseInt(params.clid);
        this.currentChannel = { id: parseInt(params.cid) };
        this.isConnectedToServer = true;
        console.log('[TS3] WhoAmI:', { myClientId: this.myClientId, channelId: this.currentChannel.id });
    }

    _handleClientList(line) {
        if (!this.currentChannel || !this.myClientId) {
            console.log('[TS3] ClientList skipped - no channel or clientId');
            return;
        }

        const clients = line.split('|');
        const me = [];
        const others = [];

        for (const clientData of clients) {
            const params = this._parseParams(clientData);
            const clientId = parseInt(params.clid);
            const channelId = parseInt(params.cid);

            if (channelId === this.currentChannel.id) {
                const client = {
                    id: clientId,
                    name: params.client_nickname || 'Unknown',
                    isSpeaking: params.client_flag_talking === '1',
                    isMe: clientId === this.myClientId
                };
                
                if (client.isMe) {
                    me.push(client);
                } else {
                    others.push(client);
                }
            }
        }

        this.clients = [...me, ...others];
        console.log('[TS3] ClientList:', this.clients.length, 'clients in channel');
        if (this.onUpdate) this.onUpdate();
    }

    _handleClientEnter(line) {
        const params = this._parseParams(line);
        const clientId = parseInt(params.clid);
        const channelId = parseInt(params.ctid);

        if (channelId === this.currentChannel?.id) {
            // Проверяем что клиента еще нет в списке
            if (!this.clients.find(c => c.id === clientId)) {
                this.clients.push({
                    id: clientId,
                    name: params.client_nickname || 'Unknown',
                    isSpeaking: false,
                    isMe: clientId === this.myClientId
                });
                console.log('[TS3] Client entered:', params.client_nickname);
                if (this.onUpdate) this.onUpdate();
            }
        }
    }

    _handleClientLeft(line) {
        const params = this._parseParams(line);
        const clientId = parseInt(params.clid);

        const index = this.clients.findIndex(c => c.id === clientId);
        if (index !== -1) {
            this.clients.splice(index, 1);
            if (this.onUpdate) this.onUpdate();
        }
    }

    _handleTalkStatus(line) {
        const params = this._parseParams(line);
        const clientId = parseInt(params.clid);
        const status = parseInt(params.status);

        const client = this.clients.find(c => c.id === clientId);
        if (client) {
            const wasSpeaking = client.isSpeaking;
            client.isSpeaking = status === 1;
            if (wasSpeaking !== client.isSpeaking) {
                console.log('[TS3] Talk status changed:', client.name, client.isSpeaking);
                if (this.onUpdate) this.onUpdate();
            }
        }
    }

    _handleClientMoved(line) {
        const params = this._parseParams(line);
        const clientId = parseInt(params.clid);
        const newChannelId = parseInt(params.ctid);

        if (clientId === this.myClientId) {
            console.log('[TS3] I moved to channel:', newChannelId);
            this.currentChannel = { id: newChannelId };
            this.clients = []; // Очищаем список
            this._sendCommand('clientlist');
        } else {
            const index = this.clients.findIndex(c => c.id === clientId);
            if (newChannelId === this.currentChannel?.id && index === -1) {
                console.log('[TS3] Client moved to my channel, refreshing list');
                this._sendCommand('clientlist');
            } else if (newChannelId !== this.currentChannel?.id && index !== -1) {
                console.log('[TS3] Client left my channel');
                this.clients.splice(index, 1);
                if (this.onUpdate) this.onUpdate();
            }
        }
    }

    disconnect() {
        // TS3 connection handled by backend
    }
}
