// TS6 Controller - Singleton с event-driven API
class TS6Controller extends EventEmitter {
    static instance = null;

    static getInstance() {
        if (!TS6Controller.instance) {
            TS6Controller.instance = new TS6Controller();
        }
        return TS6Controller.instance;
    }

    constructor() {
        if (TS6Controller.instance) return TS6Controller.instance;
        super();
        
        this.clients = [];
        this.myClientId = null;
        this.currentChannelId = null;
        this.channelName = '';
        this.isConnected = false;
        this.isConnectedToServer = false;
        this._initialized = false;
        this._listenersSetup = false;
        this._refreshTimeout = null;
        this._unlisteners = [];
    }

    async connect(apiKey = '') {
        if (!window.__TAURI__) return;
        
        if (this._initialized) {
            const { invoke } = window.__TAURI__.tauri;
            await invoke('send_ts6_command', { 
                command: JSON.stringify({ type: 'connectionInfo' })
            });
            return;
        }
        
        this._initialized = true;
        await this._setupListeners();
        
        const { invoke } = window.__TAURI__.tauri;
        await invoke('connect_ts6', { apiKey: apiKey || localStorage.getItem('ts6-api-key') || '' });
    }

    async _setupListeners() {
        if (this._listenersSetup) return;
        this._listenersSetup = true;
        
        const { listen } = window.__TAURI__.event;
        
        const unlisten1 = await listen('ts6-disconnected', () => {
            Logger.log('[TS6] Disconnected event');
            this.isConnected = false;
            this.isConnectedToServer = false;
            this.clients = [];
            this.currentChannelId = null;
            this.channelName = '';
            this.myClientId = null;
            this.emit('disconnected');
            this.emit('update');
        });
        
        const unlisten2 = await listen('ts6-message', (e) => {
            try {
                const msg = JSON.parse(e.payload);
                Logger.logTS6Message(msg);
                this._handleMessage(msg);
            } catch (err) {
                Logger.log('[TS6] Parse error:', err);
                console.error('[TS6] Parse error:', err);
            }
        });
        
        this._unlisteners.push(unlisten1, unlisten2);
    }

    async _handleMessage(msg) {
        console.log('[TS6] Event:', msg.type);
        
        const authData = TS6Parser.parseAuthMessage(msg);
        if (authData) {
            this.isConnected = true;
            if (authData.apiKey) {
                localStorage.setItem('ts6-api-key', authData.apiKey);
            }
            this.emit('connected');
            this.emit('update');
            if (authData.connection) {
                this._handleConnection(authData.connection);
            }
            return;
        }
        
        if (msg.type === 'connectionInfo' && msg.payload) {
            this._handleConnection(msg.payload);
            return;
        }
        
        if (msg.type === 'clientList') {
            if (msg.payload?.connections?.[0]) {
                this._handleConnection(msg.payload.connections[0]);
            }
            return;
        }
        
        const statusData = TS6Parser.parseConnectStatus(msg);
        if (statusData) {
            if (statusData.isConnected) {
                this.isConnectedToServer = true;
                this.emit('server-connected');
                this.emit('update');
            } else if (statusData.isDisconnected) {
                this.isConnectedToServer = false;
                this.clients = [];
                this.emit('server-disconnected');
                this.emit('update');
            }
            return;
        }
        
        const movedData = TS6Parser.parseClientMoved(msg);
        if (movedData && movedData.clientId === this.myClientId && this.currentChannelId !== movedData.newChannelId) {
            this.currentChannelId = movedData.newChannelId;
            this.clients = [];
            this.emit('update');
            return;
        }
        
        if (movedData && movedData.newChannelId === this.currentChannelId) {
            console.log('[TS6] Someone moved to my channel:', movedData.clientId, 'payload:', JSON.stringify(msg.payload));
        }
        
        const updatedData = TS6Parser.parseClientUpdated(msg);
        if (updatedData) {
            const clientId = updatedData.clientId || this.myClientId;
            const client = this.clients.find(c => c.id === clientId);
            if (client) {
                if (updatedData.nickname !== undefined) client.name = updatedData.nickname;
                if (updatedData.inputMuted !== undefined) client.inputMuted = updatedData.inputMuted;
                this.emit('client-updated', client);
                this.emit('update');
            }
            return;
        }
        
        const talkData = TS6Parser.parseTalkStatus(msg);
        if (talkData) {
            if (UserListService.updateTalkStatus(this.clients, talkData.clientId, talkData.isSpeaking)) {
                const client = this.clients.find(c => c.id === talkData.clientId);
                this.emit('talk-status', { client, isSpeaking: talkData.isSpeaking });
                this.emit('update');
            }
        }
    }

    _handleConnection(conn) {
        const result = TS6Parser.parseConnection(conn, conn.clientId);
        if (!result) return;
        
        this.myClientId = conn.clientId;
        this.clients = result.clients;
        this.currentChannelId = result.channelId;
        this.channelName = result.channelName;
        this.isConnectedToServer = true;
        
        this.emit('server-connected');
        this.emit('clients-updated', this.clients);
        this.emit('whoami', { clientId: this.myClientId, channelId: this.currentChannelId });
        this.emit('update');
    }

    async toggleMute() {
        if (!window.__TAURI__ || !this.myClientId) return;
        const { invoke } = window.__TAURI__.tauri;
        const client = this.clients.find(c => c.id === this.myClientId);
        if (!client) return;
        
        const newState = !client.inputMuted;
        await invoke('send_ts6_command', { 
            command: JSON.stringify({
                type: 'clientupdate',
                payload: { properties: { inputMuted: newState } }
            })
        });
        client.inputMuted = newState;
        this.emit('mute-toggled', newState);
    }

    getClients() {
        return this.clients;
    }

    getMyClient() {
        return this.clients.find(c => c.isMe);
    }

    getChannelName() {
        return this.channelName;
    }

    isReady() {
        return this.isConnected && this.isConnectedToServer && this.myClientId !== null;
    }

    disconnect() {
        if (this._listenersSetup) {
            this._unlisteners.forEach(unlisten => unlisten());
            this._unlisteners = [];
            this._listenersSetup = false;
        }
        this._initialized = false;
        this.isConnected = false;
        this.isConnectedToServer = false;
        this.clients = [];
        this.myClientId = null;
        this.currentChannelId = null;
        this.channelName = '';
        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
            this._refreshTimeout = null;
        }
        this.emit('disconnected');
        this.emit('update');
    }
}
