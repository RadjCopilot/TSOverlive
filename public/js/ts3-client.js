class TS3Client {
    constructor() {
        this.clients = [];
        this.currentChannelId = null;
        this.channelName = '';
        this.isConnected = false;
        this.isConnectedToServer = false;
        this.onUpdate = null;
        this.myClientId = null;
        this.apiKey = '';
        this.channels = {};
        this._clientListPending = false;
        this._unlisteners = [];
        this._instanceId = Math.random().toString(36).substr(2, 9);
        console.log('[TS3Client] Created instance:', this._instanceId);
    }

    async connect(apiKey = '') {
        if (!window.__TAURI__) return;
        
        const instanceId = this._instanceId;
        console.log('[TS3Client]', instanceId, 'connect() called, current listeners:', this._unlisteners.length);
        
        if (this._unlisteners.length > 0) {
            console.warn('[TS3Client]', instanceId, 'Duplicate connect() detected! Cleaning up', this._unlisteners.length, 'old listeners');
            this._unlisteners.forEach(unlisten => unlisten());
            this._unlisteners = [];
        }
        
        this.apiKey = apiKey;
        const { invoke } = window.__TAURI__.tauri;
        const { listen } = window.__TAURI__.event;
        
        const triggerUpdate = () => {
            if (this.onUpdate) this.onUpdate();
        };
        
        this._unlisteners.push(await listen('ts3-connected', async () => {
            console.log('[TS3Client]', instanceId, 'ts3-connected event fired');
            this.isConnected = true;
            triggerUpdate();
            
            if (this.apiKey) {
                await this._sendCommand(`auth apikey=${this.apiKey}`);
            } else {
                await this._sendCommand('auth');
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
            await this._sendCommand('use 1');
            await new Promise(resolve => setTimeout(resolve, 200));
            await this._sendCommand('clientnotifyregister schandlerid=1 event=any');
            await new Promise(resolve => setTimeout(resolve, 200));
            await this._sendCommand('whoami');
            await new Promise(resolve => setTimeout(resolve, 200));
            await this._sendCommand('clientlist -away -voice');
        }));
        
        this._unlisteners.push(await listen('ts3-message', (e) => {
            this._handleMessage(e.payload, triggerUpdate);
        }));
        
        this._unlisteners.push(await listen('ts3-disconnected', () => {
            console.log('[TS3Client]', instanceId, 'ts3-disconnected event fired');
            this.isConnected = false;
            this.isConnectedToServer = false;
            this.clients = [];
            this.myClientId = null;
            this.currentChannelId = null;
            triggerUpdate();
        }));
        
        console.log('[TS3Client]', instanceId, 'Registered', this._unlisteners.length, 'listeners');
        await invoke('connect_ts3');
    }

    async _sendCommand(cmd) {
        if (window.__TAURI__) {
            const { invoke } = window.__TAURI__.tauri;
            await invoke('send_ts3_command', { command: cmd });
        }
    }

    _handleMessage(data, triggerUpdate) {
        data.trim().split('\n').forEach(line => this._processLine(line, triggerUpdate));
    }

    _processLine(line, triggerUpdate) {
        if (line.includes('error id=1796') || line.includes('error id=1794')) {
            this.isConnectedToServer = false;
            this.clients = [];
            this.myClientId = null;
            this.currentChannelId = null;
            this.channelName = '';
            triggerUpdate();
            return;
        }
        
        if (line.includes('error id=0')) return;
        
        if (line.startsWith('notifyconnectstatuschange')) return this._handleConnectStatus(line, triggerUpdate);
        if (line.startsWith('notifycliententerview')) return this._handleClientEnter(line, triggerUpdate);
        if (line.startsWith('notifyclientleftview')) return this._handleClientLeft(line, triggerUpdate);
        if (line.startsWith('notifytalkstatuschange')) return this._handleTalkStatus(line, triggerUpdate);
        if (line.startsWith('notifyclientmoved')) return this._handleClientMoved(line, triggerUpdate);
        if (line.startsWith('notifyclientupdated')) return this._handleClientUpdated(line, triggerUpdate);
        if (line.startsWith('notify')) return;
        if (line.includes('clid=') && line.includes('client_nickname=')) return this._handleClientList(line, triggerUpdate);
        if (line.includes('cid=') && line.includes('channel_name=')) return this._handleChannelList(line);
        if (line.includes('clid=') && line.includes('cid=') && !line.includes('client_nickname=')) return this._handleWhoAmI(line);
    }

    _handleConnectStatus(line, triggerUpdate) {
        const isConnected = TS3Parser.parseConnectStatus(line);
        
        if (!isConnected) {
            this.isConnectedToServer = false;
            this.clients = [];
            this.myClientId = null;
            this.currentChannelId = null;
            triggerUpdate();
            return;
        }
        
        this.isConnectedToServer = true;
        triggerUpdate();
        setTimeout(() => this._sendCommand('whoami'), 300);
    }

    _handleWhoAmI(line) {
        const data = TS3Parser.parseWhoAmI(line);
        this.myClientId = data.clientId;
        this.currentChannelId = data.channelId;
        this.isConnectedToServer = true;
        
        setTimeout(() => {
            this._sendCommand('channellist');
        }, 200);
    }

    _handleChannelList(line) {
        const channels = line.split('|');
        for (const channelData of channels) {
            const params = TS3Parser.parseParams(channelData);
            const cid = parseInt(params.cid);
            if (cid) {
                this.channels[cid] = params.channel_name || 'Unknown';
            }
        }
        
        if (this.currentChannelId && this.channels[this.currentChannelId]) {
            this.channelName = this.channels[this.currentChannelId];
        }
        
        setTimeout(() => {
            this._sendCommand('clientlist -away -voice');
        }, 200);
    }

    _handleClientList(line, triggerUpdate) {
        if (!this.currentChannelId || !this.myClientId) return;

        this.clients = TS3Parser.parseClientList(line, this.currentChannelId, this.myClientId);
        
        if (this.currentChannelId && this.channels[this.currentChannelId]) {
            this.channelName = this.channels[this.currentChannelId];
        }
        
        triggerUpdate();
    }

    _handleClientEnter(line, triggerUpdate) {
        const data = TS3Parser.parseClientEnter(line);
        if (data.channelId !== this.currentChannelId) return;

        const added = UserListService.addClient(this.clients, {
            id: data.clientId,
            name: data.nickname,
            isSpeaking: false,
            isMe: data.clientId === this.myClientId
        });
        
        if (!added) return;
        triggerUpdate();
    }

    _handleClientLeft(line, triggerUpdate) {
        const data = TS3Parser.parseClientLeft(line);
        const removed = UserListService.removeClient(this.clients, data.clientId);
        if (!removed) return;
        triggerUpdate();
    }

    _handleTalkStatus(line, triggerUpdate) {
        const data = TS3Parser.parseTalkStatus(line);
        const changed = UserListService.updateTalkStatus(this.clients, data.clientId, data.isSpeaking);
        if (!changed) return;
        triggerUpdate();
    }

    _handleClientMoved(line, triggerUpdate) {
        const data = TS3Parser.parseClientMoved(line);

        if (data.clientId === this.myClientId) {
            this.currentChannelId = data.newChannelId;
            this.channelName = this.channels[data.newChannelId] || '';
            if (!this._clientListPending) {
                this._clientListPending = true;
                setTimeout(() => {
                    this._clientListPending = false;
                    this._sendCommand('clientlist -away -voice');
                }, 200);
            }
            return;
        }
        
        const clientExists = this.clients.find(c => c.id === data.clientId);
        
        if (data.newChannelId === this.currentChannelId && !clientExists) {
            if (!this._clientListPending) {
                this._clientListPending = true;
                setTimeout(() => {
                    this._clientListPending = false;
                    this._sendCommand('clientlist -away -voice');
                }, 200);
            }
            return;
        }
        
        if (data.newChannelId !== this.currentChannelId && clientExists) {
            UserListService.removeClient(this.clients, data.clientId);
            triggerUpdate();
        }
    }

    _handleClientUpdated(line, triggerUpdate) {
        const data = TS3Parser.parseClientUpdated(line);
        const client = this.clients.find(c => c.id === data.clientId);
        if (!client) return;
        
        let updated = false;
        if (data.nickname) {
            client.name = data.nickname;
            updated = true;
        }
        if (data.inputMuted !== undefined) {
            client.inputMuted = data.inputMuted;
            updated = true;
        }
        if (data.outputMuted !== undefined) {
            client.outputMuted = data.outputMuted;
            updated = true;
        }
        if (data.away !== undefined) {
            client.away = data.away;
            updated = true;
        }
        if (updated) triggerUpdate();
    }

    disconnect() {
        if (this._unlisteners.length > 0) {
            this._unlisteners.forEach(unlisten => unlisten());
            this._unlisteners = [];
        }
    }
}
