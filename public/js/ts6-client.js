class TS6Client {
    constructor() {
        this.clients = [];
        this.currentChannel = null;
        this.isConnected = false;
        this.isConnectedToServer = false;
        this.onUpdate = null;
        this.refreshTimeout = null;
    }

    async connect() {
        if (!window.__TAURI__) return;
        
        const { invoke } = window.__TAURI__.tauri;
        const { listen } = window.__TAURI__.event;
        
        await listen('ts6-disconnected', () => {
            this.isConnected = false;
            this.isConnectedToServer = false;
            this.clients = [];
            this.currentChannel = null;
            if (this.onUpdate) this.onUpdate();
        });
        
        await listen('ts6-message', (e) => {
            try {
                const msg = JSON.parse(e.payload);
                
                if (msg.type === 'auth' && msg.status?.code === 0) {
                    this.isConnected = true;
                    if (msg.payload?.apiKey) {
                        localStorage.setItem('ts6-api-key', msg.payload.apiKey);
                    }
                    const conn = msg.payload?.connections?.[0];
                    if (conn) {
                        this._handleConnection(conn);
                    } else {
                        if (this.onUpdate) this.onUpdate();
                    }
                }
                
                if (msg.type === 'connectStatusChanged') {
                    const status = msg.payload?.status;
                    if (status === 3) {
                        this.isConnectedToServer = true;
                        this._refreshData(invoke);
                    } else if (status === 4 || status === 0) {
                        this.isConnectedToServer = false;
                        this.clients = [];
                        this.currentChannel = null;
                        if (this.onUpdate) this.onUpdate();
                    }
                }
                
                if (msg.type === 'clientMoved') {
                    const movedClientId = msg.payload?.clientId;
                    if (movedClientId && this.currentChannel) {
                        const isOwnClient = this.clients.length === 0 || !this.clients.find(c => c.id === movedClientId);
                        if (isOwnClient || msg.payload?.newChannelId !== this.currentChannel.id) {
                            this._refreshData(invoke);
                            return;
                        }
                    }
                }
                
                if (msg.type === 'talkStatusChanged' || msg.type === 'clientMoved') {
                    this._updateClientState(msg);
                }
            } catch (err) {
                console.error('TS6 message error:', err);
            }
        });
        
        const apiKey = localStorage.getItem('ts6-api-key') || '';
        await invoke('connect_ts6', { apiKey });
    }

    _handleConnection(conn) {
        const myClient = conn.clientInfos?.find(c => c.id === conn.clientId);
        if (!myClient) return;
        
        const channelId = myClient.channelId;
        
        this.clients = [
            {
                id: conn.clientId,
                name: myClient.properties?.nickname || 'You',
                isSpeaking: myClient.properties?.flagTalking || false,
                isMe: true
            },
            ...conn.clientInfos
                .filter(c => c.channelId === channelId && c.id !== conn.clientId)
                .map(c => ({
                    id: c.id,
                    name: c.properties?.nickname || 'Unknown',
                    isSpeaking: c.properties?.flagTalking || false,
                    isMe: false
                }))
        ];
        
        this.currentChannel = { id: channelId };
        this.isConnectedToServer = true;
        
        if (this.onUpdate) this.onUpdate();
    }

    _updateClientState(msg) {
        if (!this.currentChannel) return;
        
        const clientId = msg.payload?.clientId;
        if (!clientId) return;
        
        const client = this.clients.find(c => c.id === clientId);
        
        if (msg.type === 'talkStatusChanged' && client) {
            client.isSpeaking = msg.payload?.status === 1;
            
            // Держим себя всегда первым
            if (!client.isMe) {
                const me = this.clients.find(c => c.isMe);
                const others = this.clients.filter(c => !c.isMe);
                this.clients = me ? [me, ...others] : others;
            }
            
            if (this.onUpdate) this.onUpdate();
        }
    }

    _refreshData(invoke) {
        if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
        this.refreshTimeout = setTimeout(() => {
            invoke('connect_ts6', { apiKey: localStorage.getItem('ts6-api-key') || '' });
            this.refreshTimeout = null;
        }, 500);
    }
}
