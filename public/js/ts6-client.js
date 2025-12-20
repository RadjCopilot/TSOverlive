/**
 * TS6 клиент с правильной архитектурой
 * Разделение ответственности: ConnectionHandler -> MessageHandler -> DataHandler
 */
class TS6Client {
    constructor() {
        this.dataHandler = new TS6DataHandler();
        this.messageHandler = new TS6MessageHandler(this.dataHandler);
        this.isConnected = false;
        this.authenticated = false;
        this.myClientId = null;
        this.activeConnectionId = null;
        this.eventListeners = [];
        this._instanceId = Math.random().toString(36).substr(2, 9);
    }

    async connect() {
        if (!window.__TAURI__) return;
        
        // Очищаем старые listeners перед созданием новых
        this._cleanup();
        
        const { invoke } = window.__TAURI__.tauri;
        const { listen } = window.__TAURI__.event;

        const instanceId = this._instanceId;

        this.dataHandler.onUpdate = () => {
            if (this.onUpdate) {
                this.onUpdate();
            }
        };

        const disconnectListener = await listen('ts6-disconnected', () => {
            this.isConnected = false;
            this.authenticated = false;
            this.myClientId = null;
            this.activeConnectionId = null;
            this.dataHandler.clearAll();
            if (this.onUpdate) this.onUpdate();
        });
        this.eventListeners.push(disconnectListener);

        const messageListener = await listen('ts6-message', (e) => {
            try {
                const msg = JSON.parse(e.payload);
                this._handleMessage(msg);
            } catch (err) {
                console.error('[TS6Client] Message error:', err);
            }
        });
        this.eventListeners.push(messageListener);
        
        const apiKey = localStorage.getItem('ts6-api-key') || '';
        
        await invoke('connect_ts6', { apiKey });
        await invoke('start_ts6_connection', { apiKey });
    }

    _handleMessage(msg) {
        switch (msg.type) {
            case 'auth':
                this.messageHandler.handleAuthMessage(msg);
                this.isConnected = true;
                this.authenticated = true;
                this._updateCurrentState();
                if (this.onUpdate) {
                    this.onUpdate();
                }
                break;

            case 'connectStatusChanged':
                this.messageHandler.handleConnectStatusChanged(msg);
                if (msg.payload?.status === 0) {
                    this.authenticated = false;
                    this.myClientId = null;
                    this.activeConnectionId = null;
                } else if (msg.payload?.status === 4 && msg.payload?.info) {
                    this.authenticated = true;
                    this.activeConnectionId = this.messageHandler.activeConnectionId;
                }
                this._updateCurrentState();
                if (this.onUpdate) {
                    this.onUpdate();
                }
                break;

            case 'channels':
                this.messageHandler.handleChannelsMessage(msg);
                break;

            case 'channelCreated':
                this.messageHandler.handleChannelCreated(msg);
                break;

            case 'clientMoved':
                this.messageHandler.handleClientMoved(msg);
                this._updateCurrentState();
                break;

            case 'clientPropertiesUpdated':
                this.messageHandler.handleClientPropertiesUpdated(msg);
                break;

            case 'talkStatusChanged':
                this.messageHandler.handleTalkStatusChanged(msg);
                break;

            case 'clientSelfPropertyUpdated':
                this.messageHandler.handleClientSelfPropertyUpdated(msg);
                this.activeConnectionId = this.messageHandler.activeConnectionId;
                this._updateCurrentState();
                break;

            default:
                // Игнорируем неизвестные типы сообщений
        }
    }

    _updateCurrentState() {
        const activeConnId = this.messageHandler.activeConnectionId || this.dataHandler.connections[0]?.id;
        const activeConn = this.dataHandler.getConnectionById(activeConnId);

        if (activeConn) {
            this.myClientId = activeConn.clientId;
            this.activeConnectionId = activeConn.id;

            const myClient = this.dataHandler.getClientById(this.myClientId, this.activeConnectionId);
            
            if (myClient) {
                const clientsInChannel = this.dataHandler.getClientsInChannel(
                    myClient.channelId,
                    this.activeConnectionId
                );

                clientsInChannel.forEach(c => {
                    c.isMe = c.id === this.myClientId;
                });
            }
        }
    }

    // Публичные геттеры для UI
    get clients() {
        if (!this.myClientId || !this.activeConnectionId) return [];

        const myClient = this.dataHandler.getClientById(this.myClientId, this.activeConnectionId);
        if (!myClient) return [];

        const clientsInChannel = this.dataHandler.getClientsInChannel(
            myClient.channelId,
            this.activeConnectionId
        );
        
        return clientsInChannel.map(c => ({
            ...c,
            isMe: c.id === this.myClientId
        }));
    }

    get currentChannelId() {
        if (!this.myClientId || !this.activeConnectionId) return null;
        const myClient = this.dataHandler.getClientById(this.myClientId, this.activeConnectionId);
        return myClient?.channelId || null;
    }

    get channelName() {
        if (!this.currentChannelId || !this.activeConnectionId) return '';
        const channel = this.dataHandler.getChannelById(this.currentChannelId, this.activeConnectionId);
        return channel?.name || '';
    }

    get isConnectedToServer() {
        return this.authenticated && this.activeConnectionId !== null;
    }

    _cleanup() {
        if (this.eventListeners.length > 0) {
            console.log('[TS6Client] Cleaning up', this.eventListeners.length, 'listeners');
            this.eventListeners.forEach(unlisten => unlisten());
            this.eventListeners = [];
        }
    }

    disconnect() {
        this._cleanup();
    }
}
