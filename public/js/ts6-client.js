class TS6Client {
    constructor() {
        this.clients = [];
        this.currentChannel = null;
        this.isConnected = false;
        this.onUpdate = null;
    }

    async connect() {
        if (!window.__TAURI__) return;
        
        const { invoke } = window.__TAURI__.tauri;
        const { listen } = window.__TAURI__.event;
        
        await listen('ts6-message', (e) => {
            const msg = JSON.parse(e.payload);
            if (msg.type === 'auth' && msg.status?.code === 0) {
                if (msg.payload?.apiKey) {
                    localStorage.setItem('ts6-api-key', msg.payload.apiKey);
                }
                const conn = msg.payload?.connections?.[0];
                if (conn) this._handleConnection(conn);
            }
        });
        
        const apiKey = localStorage.getItem('ts6-api-key') || '';
        await invoke('connect_ts6', { apiKey });
    }

    _handleConnection(conn) {
        const myClient = conn.clientInfos?.find(c => c.id === conn.clientId);
        if (!myClient) return;
        
        const channelId = myClient.channelId;
        
        this.clients = conn.clientInfos
            .filter(c => c.channelId === channelId && c.id !== conn.clientId)
            .map(c => ({
                id: c.id,
                name: c.properties?.nickname || 'Unknown',
                isSpeaking: c.properties?.flagTalking || false
            }));
        
        this.currentChannel = { id: channelId };
        this.isConnected = true;
        
        if (this.onUpdate) this.onUpdate();
    }
}
