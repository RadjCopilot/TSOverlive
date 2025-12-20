/**
 * Управляет локальным состоянием данных TS6
 * Хранит connections, channels, clients независимо от UI
 */
class TS6DataHandler {
    constructor() {
        this.localConnections = [];
        this.localChannels = [];
        this.localClients = [];
        this.onUpdate = null;
    }

    get connections() {
        return this.localConnections;
    }

    get channels() {
        return this.localChannels;
    }

    get clients() {
        return this.localClients;
    }

    clearAll() {
        this.localConnections = [];
        this.localChannels = [];
        this.localClients = [];
        this._notifyUpdate();
    }

    addConnection(connection) {
        const exists = this.localConnections.find(c => c.id === connection.id);
        if (exists) {
            console.warn('[TS6] Duplicate connection detected:', connection.id);
            return;
        }
        this.localConnections.push(connection);
        this._notifyUpdate();
    }

    addChannel(channel) {
        const exists = this.localChannels.find(c => 
            c.id === channel.id && c.connectionId === channel.connectionId
        );
        if (!exists) {
            this.localChannels.push(channel);
            this._notifyUpdate();
        }
    }

    addClient(client) {
        const exists = this.localClients.find(c => 
            c.id === client.id && c.connectionId === client.connectionId
        );
        if (!exists) {
            this.localClients.push(client);
            this._notifyUpdate();
        }
    }

    updateConnection(connection) {
        const idx = this.localConnections.findIndex(c => c.id === connection.id);
        if (idx !== -1) {
            this.localConnections[idx] = connection;
            this._notifyUpdate();
        }
    }

    updateChannel(channel) {
        const idx = this.localChannels.findIndex(c => 
            c.id === channel.id && c.connectionId === channel.connectionId
        );
        if (idx !== -1) {
            this.localChannels[idx] = channel;
            this._notifyUpdate();
        }
    }

    updateClient(client) {
        const idx = this.localClients.findIndex(c => 
            c.id === client.id && c.connectionId === client.connectionId
        );
        if (idx !== -1) {
            this.localClients[idx] = client;
            this._notifyUpdate();
        }
    }

    removeConnection(connectionId) {
        this.localConnections = this.localConnections.filter(c => c.id !== connectionId);
        this.localChannels = this.localChannels.filter(c => c.connectionId !== connectionId);
        this.localClients = this.localClients.filter(c => c.connectionId !== connectionId);
        this._notifyUpdate();
    }

    removeChannel(channelId, connectionId) {
        this.localChannels = this.localChannels.filter(c => 
            !(c.id === channelId && c.connectionId === connectionId)
        );
        this.localClients = this.localClients.filter(c => 
            !(c.channelId === channelId && c.connectionId === connectionId)
        );
        this._notifyUpdate();
    }

    removeClient(clientId, connectionId) {
        this.localClients = this.localClients.filter(c => 
            !(c.id === clientId && c.connectionId === connectionId)
        );
        this._notifyUpdate();
    }

    getConnectionById(id) {
        return this.localConnections.find(c => c.id === id);
    }

    getChannelById(id, connectionId) {
        return this.localChannels.find(c => 
            c.id === id && c.connectionId === connectionId
        );
    }

    getClientById(id, connectionId) {
        return this.localClients.find(c => 
            c.id === id && c.connectionId === connectionId
        );
    }

    getClientsInChannel(channelId, connectionId) {
        return this.localClients.filter(c => 
            c.channelId === channelId && c.connectionId === connectionId
        );
    }

    _notifyUpdate() {
        if (this.onUpdate) {
            this.onUpdate();
        }
    }
}
