// TS3 Controller - Singleton с event-driven API
class TS3Controller extends EventEmitter {
    static instance = null;

    static getInstance() {
        if (!TS3Controller.instance) {
            TS3Controller.instance = new TS3Controller();
        }
        return TS3Controller.instance;
    }

    constructor() {
        if (TS3Controller.instance) return TS3Controller.instance;
        super();
        
        this.clients = [];
        this.myClientId = null;
        this.currentChannelId = null;
        this.channelName = '';
        this.channels = {};
        this.isConnected = false;
        this.isConnectedToServer = false;
        this._initialized = false;
        this._unlisteners = [];
    }

    async connect(apiKey = '') {
        if (!window.__TAURI__) return;
        
        if (!this._initialized) {
            this._initialized = true;
            await this._setupListeners();
        }
        
        const { invoke } = window.__TAURI__.tauri;
        await invoke('connect_ts3', { apiKey });
    }

    async _setupListeners() {
        const { listen } = window.__TAURI__.event;
        
        const unlisten1 = await listen('ts3-connected', async () => {
            this.isConnected = true;
            this.emit('connected');
            await this._authenticate();
        });
        
        const unlisten2 = await listen('ts3-message', (e) => this._handleMessage(e.payload));
        
        const unlisten3 = await listen('ts3-disconnected', () => {
            this.isConnected = false;
            this.isConnectedToServer = false;
            this.clients = [];
            this.myClientId = null;
            this.currentChannelId = null;
            this.emit('disconnected');
        });
        
        this._unlisteners.push(unlisten1, unlisten2, unlisten3);
    }

    async _authenticate() {
        const apiKey = localStorage.getItem('ts3-api-key') || '';
        await this._send(apiKey ? `auth apikey=${apiKey}` : 'auth');
        await this._delay(200);
        await this._send('use 1');
        await this._delay(200);
        await this._send('clientnotifyregister schandlerid=1 event=any');
        await this._delay(200);
        await this._send('whoami');
        await this._delay(200);
        await this._send('clientlist');
    }

    async _send(cmd) {
        if (!window.__TAURI__) return;
        const { invoke } = window.__TAURI__.tauri;
        await invoke('send_ts3_command', { command: cmd });
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _handleMessage(data) {
        data.trim().split('\n').forEach(line => this._processLine(line));
    }

    _processLine(line) {
        if (line.includes('error id=1796') || line.includes('error id=1794')) {
            this.isConnectedToServer = false;
            this.clients = [];
            this.emit('server-disconnected');
            return;
        }
        
        if (line.includes('error id=0')) return;
        
        if (line.startsWith('notifyconnectstatuschange')) {
            const isConnected = TS3Parser.parseConnectStatus(line);
            if (isConnected) {
                this.isConnectedToServer = true;
                this.emit('server-connected');
                this.emit('update');
                setTimeout(() => this._send('whoami'), 300);
            } else {
                this.isConnectedToServer = false;
                this.clients = [];
                this.emit('server-disconnected');
                this.emit('update');
            }
            return;
        }
        
        if (line.startsWith('notifycliententerview')) {
            const data = TS3Parser.parseClientEnter(line);
            if (data.channelId === this.currentChannelId) {
                const client = {
                    id: data.clientId,
                    name: data.nickname,
                    isSpeaking: false,
                    isMe: data.clientId === this.myClientId
                };
                if (UserListService.addClient(this.clients, client)) {
                    this.emit('client-enter', client);
                    this.emit('update');
                }
            }
            return;
        }
        
        if (line.startsWith('notifyclientleftview')) {
            const data = TS3Parser.parseClientLeft(line);
            const client = this.clients.find(c => c.id === data.clientId);
            if (client && UserListService.removeClient(this.clients, data.clientId)) {
                this.emit('client-leave', client);
                this.emit('update');
            }
            return;
        }
        
        if (line.startsWith('notifytalkstatuschange')) {
            const data = TS3Parser.parseTalkStatus(line);
            if (UserListService.updateTalkStatus(this.clients, data.clientId, data.isSpeaking)) {
                const client = this.clients.find(c => c.id === data.clientId);
                this.emit('talk-status', { client, isSpeaking: data.isSpeaking });
                this.emit('update');
            }
            return;
        }
        
        if (line.startsWith('notifyclientmoved')) {
            const data = TS3Parser.parseClientMoved(line);
            
            if (data.clientId === this.myClientId) {
                this.currentChannelId = data.newChannelId;
                this.channelName = this.channels[data.newChannelId] || '';
                this.clients = [];
                this.emit('self-moved', { channelId: data.newChannelId, channelName: this.channelName });
                this.emit('update');
                setTimeout(() => this._send('clientlist'), 200);
                return;
            }
            
            const client = this.clients.find(c => c.id === data.clientId);
            
            if (data.newChannelId === this.currentChannelId && !client) {
                setTimeout(() => this._send('clientlist'), 200);
            } else if (data.newChannelId !== this.currentChannelId && client) {
                UserListService.removeClient(this.clients, data.clientId);
                this.emit('client-moved-out', client);
                this.emit('update');
            }
            return;
        }
        
        if (line.startsWith('notifyclientupdated')) {
            const data = TS3Parser.parseClientUpdated(line);
            const client = this.clients.find(c => c.id === data.clientId);
            if (client) {
                if (data.nickname) client.name = data.nickname;
                if (data.inputMuted !== undefined) client.inputMuted = data.inputMuted;
                this.emit('client-updated', client);
                this.emit('update');
            }
            return;
        }
        
        if (line.includes('clid=') && line.includes('cid=') && !line.includes('client_nickname=')) {
            const data = TS3Parser.parseWhoAmI(line);
            this.myClientId = data.clientId;
            this.currentChannelId = data.channelId;
            this.isConnectedToServer = true;
            this.emit('whoami', { clientId: this.myClientId, channelId: this.currentChannelId });
            setTimeout(() => this._send('channellist'), 200);
            return;
        }
        
        if (line.includes('cid=') && line.includes('channel_name=')) {
            const channels = line.split('|');
            for (const channelData of channels) {
                const params = TS3Parser.parseParams(channelData);
                const cid = parseInt(params.cid);
                if (cid) this.channels[cid] = params.channel_name || 'Unknown';
            }
            if (this.currentChannelId) {
                this.channelName = this.channels[this.currentChannelId] || '';
            }
            this.emit('channels-loaded', this.channels);
            setTimeout(() => this._send('clientlist'), 200);
            return;
        }
        
        if (line.includes('clid=') && line.includes('client_nickname=')) {
            if (!this.currentChannelId || !this.myClientId) return;
            this.clients = TS3Parser.parseClientList(line, this.currentChannelId, this.myClientId);
            this.emit('clients-updated', this.clients);
            this.emit('update');
        }
    }

    async toggleMute() {
        if (!this.myClientId) return;
        const client = this.clients.find(c => c.id === this.myClientId);
        if (!client) return;
        const newState = client.inputMuted ? 0 : 1;
        await this._send(`clientupdate client_input_muted=${newState}`);
        client.inputMuted = !client.inputMuted;
        this.emit('mute-toggled', client.inputMuted);
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
        this._unlisteners.forEach(unlisten => unlisten());
        this._unlisteners = [];
        this._initialized = false;
        this.isConnected = false;
        this.isConnectedToServer = false;
        this.clients = [];
        this.myClientId = null;
        this.currentChannelId = null;
        this.channelName = '';
        this.channels = {};
        this.emit('disconnected');
        this.emit('update');
    }
}
