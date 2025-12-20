// TS6 Controller - WebSocket в JS
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
        
        this.ws = null;
        this.clients = [];
        this.myClientId = null;
        this.currentChannelId = null;
        this.channelName = '';
        this.isConnected = false;
        this.isConnectedToServer = false;
        this._reconnectKey = '';
    }

    async connect(apiKey = '') {
        if (this.ws) return;
        
        this._reconnectKey = apiKey || localStorage.getItem('ts6-api-key') || '';
        Logger.log('[TS6] Connecting');
        
        this.ws = new WebSocket('ws://127.0.0.1:5899');
        
        this.ws.onopen = () => {
            Logger.log('[TS6] Connected');
            this.ws.send(JSON.stringify({
                type: 'auth',
                payload: {
                    identifier: 'com.radj.teamspeak-overlive',
                    version: '1.0.1',
                    name: 'TeamSpeak OverLive',
                    description: 'Overlay widget for TeamSpeak 6 and 3',
                    content: { apiKey: this._reconnectKey },
                    autoApprove: true
                }
            }));
        };
        
        this.ws.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                Logger.logTS6Message(msg);
                this._handleMessage(msg);
            } catch (err) {
                Logger.log('[TS6] Parse error:', err);
            }
        };
        
        this.ws.onerror = (e) => Logger.log('[TS6] Error:', e);
        this.ws.onclose = () => {
            Logger.log('[TS6] Closed');
            this.ws = null;
            this.isConnected = false;
            this.isConnectedToServer = false;
            this.clients = [];
            this.emit('disconnected');
            this.emit('update');
            setTimeout(() => this.connect(this._reconnectKey), 3000);
        };
    }

    _handleMessage(msg) {
        console.log('[TS6] Message type:', msg.type, 'payload:', msg.payload);
        
        const authData = TS6Parser.parseAuthMessage(msg);
        if (authData) {
            console.log('[TS6] Auth success');
            this.isConnected = true;
            if (authData.apiKey) localStorage.setItem('ts6-api-key', authData.apiKey);
            this.emit('connected');
            this.emit('update');
            if (authData.connection) this._handleConnection(authData.connection);
            return;
        }
        
        if (msg.type === 'connectionInfo' && msg.payload) {
            console.log('[TS6] Got connectionInfo');
            this._handleConnection(msg.payload);
            return;
        }
        
        if (msg.type === 'clientList' && msg.payload?.connections?.[0]) {
            console.log('[TS6] Got clientList');
            this._handleConnection(msg.payload.connections[0]);
            return;
        }
        
        const statusData = TS6Parser.parseConnectStatus(msg);
        if (statusData) {
            console.log('[TS6] Connect status:', statusData);
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
        if (movedData) {
            console.log('[TS6] Client moved:', movedData.clientId, 'to channel:', movedData.newChannelId, 'myClientId:', this.myClientId, 'currentChannel:', this.currentChannelId);
            if (movedData.clientId === this.myClientId && this.currentChannelId !== movedData.newChannelId) {
                console.log('[TS6] I moved to new channel, requesting clientList');
                this.currentChannelId = movedData.newChannelId;
                this.clients = [];
                this.emit('update');
                this.ws.send(JSON.stringify({ type: 'clientList' }));
                return;
            }
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
        if (!this.ws || !this.myClientId) return;
        const client = this.clients.find(c => c.id === this.myClientId);
        if (!client) return;
        
        const newState = !client.inputMuted;
        this.ws.send(JSON.stringify({
            type: 'clientupdate',
            payload: { properties: { inputMuted: newState } }
        }));
        client.inputMuted = newState;
        this.emit('mute-toggled', newState);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.isConnectedToServer = false;
        this.clients = [];
        this.myClientId = null;
        this.currentChannelId = null;
        this.channelName = '';
        this.emit('disconnected');
        this.emit('update');
    }

    getClients() { return this.clients; }
    getMyClient() { return this.clients.find(c => c.isMe); }
    getChannelName() { return this.channelName; }
    isReady() { return this.isConnected && this.isConnectedToServer && this.myClientId !== null; }
}
