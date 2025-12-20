class TS6Client {
    constructor() {
        this.clients = [];
        this.currentChannelId = null;
        this.channelName = '';
        this.isConnected = false;
        this.isConnectedToServer = false;
        this.onUpdate = null;
        this.refreshTimeout = null;
        this.myClientId = null;
    }

    async connect() {
        if (!window.__TAURI__) return;
        
        const { invoke } = window.__TAURI__.tauri;
        const { listen } = window.__TAURI__.event;
        
        await listen('ts6-disconnected', () => {
            console.log('[TS6] Disconnected');
            this.isConnected = false;
            this.isConnectedToServer = false;
            this.clients = [];
            this.currentChannelId = null;
            this.channelName = '';
            this.myClientId = null;
            if (this.onUpdate) this.onUpdate();
        });
        
        await listen('ts6-message', (e) => {
            try {
                const msg = JSON.parse(e.payload);
                console.log('[TS6] Message:', msg.type);
                
                const authData = TS6Parser.parseAuthMessage(msg);
                if (authData) {
                    console.log('[TS6] Auth success');
                    this.isConnected = true;
                    if (authData.apiKey) {
                        localStorage.setItem('ts6-api-key', authData.apiKey);
                    }
                    if (authData.connection) {
                        this._handleConnection(authData.connection);
                    } else {
                        if (this.onUpdate) this.onUpdate();
                    }
                    return;
                }
                
                const statusData = TS6Parser.parseConnectStatus(msg);
                if (statusData) {
                    if (statusData.isConnected) {
                        console.log('[TS6] Connected to server');
                        this.isConnectedToServer = true;
                        this._refreshData(invoke);
                    } else if (statusData.isDisconnected) {
                        console.log('[TS6] Disconnected from server');
                        this.isConnectedToServer = false;
                        this.clients = [];
                        this.currentChannelId = null;
                        this.channelName = '';
                        if (this.onUpdate) this.onUpdate();
                    }
                    return;
                }
                
                const movedData = TS6Parser.parseClientMoved(msg);
                if (movedData) {
                    if (movedData.clientId === this.myClientId) {
                        this._refreshData(invoke);
                        return;
                    }
                    
                    const clientExists = this.clients.find(c => c.id === movedData.clientId);
                    if (!clientExists || movedData.newChannelId !== this.currentChannelId) {
                        this._refreshData(invoke);
                        return;
                    }
                }
                
                const updatedData = TS6Parser.parseClientUpdated(msg);
                if (updatedData) {
                    const client = this.clients.find(c => c.id === updatedData.clientId);
                    if (client) {
                        let updated = false;
                        if (updatedData.nickname) {
                            client.name = updatedData.nickname;
                            updated = true;
                        }
                        if (updatedData.inputMuted !== undefined) {
                            client.inputMuted = updatedData.inputMuted;
                            updated = true;
                        }
                        if (updated && this.onUpdate) this.onUpdate();
                    }
                    return;
                }
                
                const talkData = TS6Parser.parseTalkStatus(msg);
                if (talkData) {
                    this._updateClientState(talkData);
                }
            } catch (err) {
                console.error('TS6 message error:', err);
            }
        });
        
        const apiKey = localStorage.getItem('ts6-api-key') || '';
        await invoke('connect_ts6', { apiKey });
    }

    _handleConnection(conn) {
        const result = TS6Parser.parseConnection(conn, conn.clientId);
        if (!result) {
            console.log('[TS6] Failed to parse connection');
            return;
        }
        
        console.log('[TS6] Connection parsed:', result.clients.length, 'clients, channel:', result.channelName);
        this.myClientId = conn.clientId;
        this.clients = result.clients;
        this.currentChannelId = result.channelId;
        this.channelName = result.channelName;
        this.isConnectedToServer = true;
        
        if (this.onUpdate) this.onUpdate();
    }

    _updateClientState(data) {
        if (!this.currentChannelId) return;
        
        const changed = UserListService.updateTalkStatus(this.clients, data.clientId, data.isSpeaking);
        if (changed && this.onUpdate) {
            this.onUpdate();
        }
    }

    _refreshData(invoke) {
        if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
        this.refreshTimeout = setTimeout(() => {
            invoke('connect_ts6', { apiKey: localStorage.getItem('ts6-api-key') || '' });
            this.refreshTimeout = null;
        }, 500);
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
    }
}
