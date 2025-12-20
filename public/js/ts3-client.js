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
        this.listenersRegistered = false;
        this.channels = {};
        this._clientListPending = false;
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
                this.currentChannelId = null;
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
        data.trim().split('\n').forEach(line => this._processLine(line));
    }

    _processLine(line) {
        if (line.includes('error id=1796') || line.includes('error id=1794')) {
            console.log('[TS3] Not connected to server (error 1796/1794)');
            this.isConnectedToServer = false;
            this.clients = [];
            this.myClientId = null;
            this.currentChannelId = null;
            this.channelName = '';
            if (this.onUpdate) this.onUpdate();
            return;
        }
        
        if (line.includes('error id=0')) return;
        
        if (line.startsWith('notifyconnectstatuschange')) {
            console.log('[TS3] Processing connectstatuschange');
            return this._handleConnectStatus(line);
        }
        if (line.startsWith('notifycliententerview')) {
            console.log('[TS3] Processing cliententerview');
            return this._handleClientEnter(line);
        }
        if (line.startsWith('notifyclientleftview')) {
            console.log('[TS3] Processing clientleftview');
            return this._handleClientLeft(line);
        }
        if (line.startsWith('notifytalkstatuschange')) return this._handleTalkStatus(line);
        if (line.startsWith('notifyclientmoved')) {
            console.log('[TS3] Processing clientmoved');
            return this._handleClientMoved(line);
        }
        if (line.startsWith('notifyclientupdated')) {
            console.log('[TS3] Processing clientupdated');
            return this._handleClientUpdated(line);
        }
        if (line.startsWith('notify')) return;
        if (line.includes('clid=') && line.includes('client_nickname=')) {
            console.log('[TS3] Processing clientlist');
            return this._handleClientList(line);
        }
        if (line.includes('cid=') && line.includes('channel_name=')) {
            console.log('[TS3] Processing channellist');
            return this._handleChannelList(line);
        }
        if (line.includes('clid=') && line.includes('cid=') && !line.includes('client_nickname=')) {
            console.log('[TS3] Processing whoami');
            return this._handleWhoAmI(line);
        }
    }



    _handleConnectStatus(line) {
        const isConnected = TS3Parser.parseConnectStatus(line);
        console.log('[TS3] Connect status:', isConnected);
        
        if (!isConnected) {
            console.log('[TS3] Disconnected from server');
            this.isConnectedToServer = false;
            this.clients = [];
            this.myClientId = null;
            this.currentChannelId = null;
            if (this.onUpdate) this.onUpdate();
            return;
        }
        
        console.log('[TS3] Connected to server');
        this.isConnectedToServer = true;
        setTimeout(() => this._sendCommand('whoami'), 300);
    }

    _handleWhoAmI(line) {
        const data = TS3Parser.parseWhoAmI(line);
        this.myClientId = data.clientId;
        this.currentChannelId = data.channelId;
        this.isConnectedToServer = true;
        console.log('[TS3] WhoAmI: myClientId=', this.myClientId, 'channelId=', this.currentChannelId);
        console.log('[TS3] Setting myClientId to', this.myClientId, '- this is ME');
        
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
        console.log('[TS3] Channels loaded:', Object.keys(this.channels).length);
        
        if (this.currentChannelId && this.channels[this.currentChannelId]) {
            this.channelName = this.channels[this.currentChannelId];
            console.log('[TS3] Current channel name:', this.channelName);
        }
        
        setTimeout(() => {
            this._sendCommand('clientlist');
        }, 200);
    }

    _handleClientList(line) {
        if (!this.currentChannelId || !this.myClientId) {
            console.log('[TS3] ClientList skipped - no channel or clientId');
            return;
        }

        console.log('[TS3] Parsing clientlist with myClientId=', this.myClientId);
        this.clients = TS3Parser.parseClientList(line, this.currentChannelId, this.myClientId);
        console.log('[TS3] ClientList: found', this.clients.length, 'clients in channel', this.currentChannelId);
        console.log('[TS3] Clients:', this.clients.map(c => `${c.name} (id=${c.id}, isMe=${c.isMe})`).join(', '));
        
        const owner = this.clients.find(c => c.isMe);
        if (owner) {
            console.log('[TS3] Owner found:', owner.name, 'id=', owner.id);
        } else {
            console.log('[TS3] WARNING: No owner found! myClientId=', this.myClientId);
        }
        
        if (this.currentChannelId && this.channels[this.currentChannelId]) {
            this.channelName = this.channels[this.currentChannelId];
            console.log('[TS3] Updated channel name:', this.channelName);
        }
        
        if (this.onUpdate) this.onUpdate();
    }

    _handleClientEnter(line) {
        const data = TS3Parser.parseClientEnter(line);
        if (data.channelId !== this.currentChannelId) return;

        const added = UserListService.addClient(this.clients, {
            id: data.clientId,
            name: data.nickname,
            isSpeaking: false,
            isMe: data.clientId === this.myClientId
        });
        
        if (!added) return;
        
        console.log('[TS3] Client entered:', data.nickname, 'isMe:', data.clientId === this.myClientId);
        if (this.onUpdate) this.onUpdate();
    }

    _handleClientLeft(line) {
        const data = TS3Parser.parseClientLeft(line);
        const removed = UserListService.removeClient(this.clients, data.clientId);
        if (!removed) return;
        
        console.log('[TS3] Client left:', data.clientId);
        if (this.onUpdate) this.onUpdate();
    }

    _handleTalkStatus(line) {
        const data = TS3Parser.parseTalkStatus(line);
        const changed = UserListService.updateTalkStatus(this.clients, data.clientId, data.isSpeaking);
        if (!changed) return;
        
        const client = this.clients.find(c => c.id === data.clientId);
        console.log('[TS3] Talk status changed:', client?.name, data.isSpeaking);
        if (this.onUpdate) this.onUpdate();
    }

    _handleClientMoved(line) {
        const data = TS3Parser.parseClientMoved(line);

        if (data.clientId === this.myClientId) {
            console.log('[TS3] I moved to channel:', data.newChannelId);
            this.currentChannelId = data.newChannelId;
            this.channelName = this.channels[data.newChannelId] || '';
            this.clients = [];
            if (!this._clientListPending) {
                this._clientListPending = true;
                setTimeout(() => {
                    this._clientListPending = false;
                    this._sendCommand('clientlist');
                }, 200);
            }
            return;
        }
        
        const clientExists = this.clients.find(c => c.id === data.clientId);
        
        if (data.newChannelId === this.currentChannelId && !clientExists) {
            console.log('[TS3] Client', data.clientId, 'moved to my channel, adding via clientlist');
            if (!this._clientListPending) {
                this._clientListPending = true;
                setTimeout(() => {
                    this._clientListPending = false;
                    this._sendCommand('clientlist');
                }, 200);
            }
            return;
        }
        
        if (data.newChannelId !== this.currentChannelId && clientExists) {
            console.log('[TS3] Client', data.clientId, 'left my channel');
            UserListService.removeClient(this.clients, data.clientId);
            if (this.onUpdate) this.onUpdate();
        }
    }

    _handleClientUpdated(line) {
        const data = TS3Parser.parseClientUpdated(line);
        const client = this.clients.find(c => c.id === data.clientId);
        if (!client) return;
        
        let updated = false;
        if (data.nickname) {
            client.name = data.nickname;
            console.log('[TS3] Client nickname updated:', data.nickname);
            updated = true;
        }
        if (data.inputMuted !== undefined) {
            client.inputMuted = data.inputMuted;
            console.log('[TS3] Client mute status updated:', data.inputMuted);
            updated = true;
        }
        if (updated && this.onUpdate) this.onUpdate();
    }

    disconnect() {
        // TS3 connection handled by backend
    }

    async toggleMute() {
        if (!this.myClientId) return;
        const client = this.clients.find(c => c.id === this.myClientId);
        if (!client) return;
        const newState = client.inputMuted ? 0 : 1;
        await this._sendCommand(`clientupdate client_input_muted=${newState}`);
        client.inputMuted = !client.inputMuted;
    }
}
