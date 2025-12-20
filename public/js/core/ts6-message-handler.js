/**
 * Обрабатывает входящие сообщения от TS6 клиента
 */
class TS6MessageHandler {
    constructor(dataHandler) {
        this.dataHandler = dataHandler;
        this.activeConnectionId = null;
    }

    handleAuthMessage(data) {
        if (data.status?.code !== 0) return;

        const apiKey = data.payload?.apiKey;
        if (apiKey) {
            localStorage.setItem('ts6-api-key', apiKey);
        }

        const connections = data.payload?.connections || [];
        connections.forEach(conn => {
            this._processConnection(conn);
        });
    }

    handleConnectStatusChanged(data) {
        const connectionId = data.payload?.connectionId;
        const status = data.payload?.status;
        console.log('[TS6] connectStatusChanged - connId:', connectionId, 'status:', status, 'has info:', !!data.payload?.info);

        if (status === 0) {
            console.log('[TS6] Removing connection:', connectionId);
            this.dataHandler.removeConnection(connectionId);
            if (this.activeConnectionId === connectionId) {
                this.activeConnectionId = this.dataHandler.connections[0]?.id || null;
                console.log('[TS6] Updated activeConnectionId to:', this.activeConnectionId);
            }
        } else if (status === 4 && data.payload?.info) {
            console.log('[TS6] Adding connection:', connectionId, 'clientId:', data.payload.info.clientId);
            this.dataHandler.addConnection({
                id: connectionId,
                clientId: data.payload.info.clientId
            });
            this.activeConnectionId = connectionId;
            console.log('[TS6] Set activeConnectionId to:', this.activeConnectionId);
            
            const info = data.payload.info;
            
            if (info.channelInfos) {
                this._parseChannelInfos(info.channelInfos, connectionId);
            }
            
            if (info.clientInfos) {
                console.log('[TS6] Adding', info.clientInfos.length, 'clients');
                info.clientInfos.forEach(clientInfo => {
                    this.dataHandler.addClient({
                        id: clientInfo.id,
                        connectionId: connectionId,
                        channelId: clientInfo.channelId,
                        name: clientInfo.properties?.nickname || 'Unknown',
                        isSpeaking: false,
                        inputMuted: clientInfo.properties?.inputMuted || false,
                        outputMuted: clientInfo.properties?.outputMuted || false,
                        away: clientInfo.properties?.away || false,
                        talkStatus: 0
                    });
                });
            }
        }
    }

    handleChannelsMessage(data) {
        const connectionId = data.payload?.connectionId;
        const connection = this.dataHandler.getConnectionById(connectionId);
        
        if (connection && data.payload?.info) {
            this._parseChannelInfos(data.payload.info, connectionId);
        }
    }

    handleChannelCreated(data) {
        const connectionId = data.payload?.connectionId;
        const connection = this.dataHandler.getConnectionById(connectionId);
        
        if (connection) {
            this.dataHandler.addChannel({
                id: data.payload.channelId,
                connectionId: connectionId,
                parentId: data.payload.parentId,
                name: data.payload.properties?.name || '',
                order: data.payload.properties?.order || 0
            });
        }
    }

    handleClientMoved(data) {
        const clientId = data.payload?.clientId;
        const connectionId = data.payload?.connectionId;
        const oldChannelId = data.payload?.oldChannelId;
        const newChannelId = data.payload?.newChannelId;

        if (oldChannelId === 0) {
            // Новый клиент подключился
            setTimeout(() => {
                const channel = this.dataHandler.getChannelById(newChannelId, connectionId);
                if (channel) {
                    this.dataHandler.addClient({
                        id: clientId,
                        connectionId: connectionId,
                        channelId: newChannelId,
                        name: data.payload?.properties?.nickname || 'Unknown',
                        isSpeaking: false,
                        inputMuted: data.payload?.properties?.inputMuted || false,
                        outputMuted: data.payload?.properties?.outputMuted || false,
                        away: data.payload?.properties?.away || false,
                        talkStatus: 0
                    });
                }
            }, 100);
        } else if (newChannelId === 0) {
            // Клиент отключился
            this.dataHandler.removeClient(clientId, connectionId);
        } else {
            // Клиент переместился
            const client = this.dataHandler.getClientById(clientId, connectionId);
            if (client) {
                this.dataHandler.updateClient({
                    ...client,
                    channelId: newChannelId
                });
            } else {
                // Клиент присоединился к серверу
                const channel = this.dataHandler.getChannelById(newChannelId, connectionId);
                if (channel) {
                    this.dataHandler.addClient({
                        id: clientId,
                        connectionId: connectionId,
                        channelId: newChannelId,
                        name: data.payload?.properties?.nickname || 'Unknown',
                        isSpeaking: false,
                        inputMuted: data.payload?.properties?.inputMuted || false,
                        outputMuted: data.payload?.properties?.outputMuted || false,
                        away: data.payload?.properties?.away || false,
                        talkStatus: 0
                    });
                }
            }
        }
    }

    handleClientPropertiesUpdated(data) {
        const clientId = data.payload?.clientId;
        const connectionId = data.payload?.connectionId;
        const client = this.dataHandler.getClientById(clientId, connectionId);

        if (client) {
            const props = data.payload?.properties || {};
            this.dataHandler.updateClient({
                ...client,
                name: props.nickname !== undefined ? props.nickname : client.name,
                inputMuted: props.inputMuted !== undefined ? props.inputMuted : client.inputMuted,
                outputMuted: props.outputMuted !== undefined ? props.outputMuted : client.outputMuted,
                away: props.away !== undefined ? props.away : client.away
            });
        }
    }

    handleTalkStatusChanged(data) {
        const clientId = data.payload?.clientId;
        const connectionId = data.payload?.connectionId;
        const status = data.payload?.status;
        const client = this.dataHandler.getClientById(clientId, connectionId);

        if (client) {
            const isSpeaking = status === 1;
            this.dataHandler.updateClient({
                ...client,
                isSpeaking: isSpeaking,
                talkStatus: status,
                lastSpokeAt: isSpeaking ? Date.now() : client.lastSpokeAt
            });
        }
    }

    handleClientSelfPropertyUpdated(data) {
        const connectionId = data.payload?.connectionId;
        if (data.payload?.flag === 'inputHardware') {
            this.activeConnectionId = connectionId;
        }
    }

    _processConnection(conn) {
        this.dataHandler.addConnection({
            id: conn.id,
            clientId: conn.clientId
        });

        if (!this.activeConnectionId) {
            this.activeConnectionId = conn.id;
        }

        if (conn.channelInfos) {
            this._parseChannelInfos(conn.channelInfos, conn.id);
        }

        if (conn.clientInfos) {
            conn.clientInfos.forEach(clientInfo => {
                this.dataHandler.addClient({
                    id: clientInfo.id,
                    connectionId: conn.id,
                    channelId: clientInfo.channelId,
                    name: clientInfo.properties?.nickname || 'Unknown',
                    isSpeaking: false,
                    inputMuted: clientInfo.properties?.inputMuted || false,
                    outputMuted: clientInfo.properties?.outputMuted || false,
                    away: clientInfo.properties?.away || false,
                    talkStatus: 0
                });
            });
        }
    }

    _parseChannelInfos(channelInfos, connectionId) {
        const parseChannels = (channels, parentId = 0) => {
            if (!channels) return;
            
            channels.forEach(channel => {
                this.dataHandler.addChannel({
                    id: channel.id,
                    connectionId: connectionId,
                    parentId: parentId,
                    name: channel.properties?.name || '',
                    order: channel.properties?.order || 0
                });

                if (channel.subChannels) {
                    parseChannels(channel.subChannels, channel.id);
                }
            });
        };

        if (channelInfos.rootChannels) {
            parseChannels(channelInfos.rootChannels);
        }

        if (channelInfos.subChannels) {
            for (const parentId in channelInfos.subChannels) {
                parseChannels(channelInfos.subChannels[parentId], parseInt(parentId));
            }
        }
    }
}
