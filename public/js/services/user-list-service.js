class UserListService {
    static sortAndLimit(clients, maxUsers) {
        const me = clients.find(c => c.isMe);
        const others = clients.filter(c => !c.isMe);
        
        const sortedOthers = others.sort((a, b) => {
            if (a.isSpeaking && !b.isSpeaking) return -1;
            if (!a.isSpeaking && b.isSpeaking) return 1;
            if (!a.isSpeaking && !b.isSpeaking) {
                const aTime = a.lastSpokeAt || 0;
                const bTime = b.lastSpokeAt || 0;
                return bTime - aTime;
            }
            return 0;
        });
        
        const sorted = me ? [me, ...sortedOthers] : sortedOthers;
        return sorted.slice(0, maxUsers);
    }

    static updateTalkStatus(clients, clientId, isSpeaking) {
        const client = clients.find(c => c.id === clientId);
        if (!client) return false;

        const changed = client.isSpeaking !== isSpeaking;
        client.isSpeaking = isSpeaking;
        if (isSpeaking) {
            client.lastSpokeAt = Date.now();
        }
        return changed;
    }

    static addClient(clients, newClient) {
        if (clients.find(c => c.id === newClient.id)) return false;
        if (!newClient.inputMuted) newClient.inputMuted = false;
        clients.push(newClient);
        return true;
    }

    static removeClient(clients, clientId) {
        const index = clients.findIndex(c => c.id === clientId);
        if (index === -1) return false;
        clients.splice(index, 1);
        return true;
    }

    static getOwner(clients) {
        return clients.find(c => c.isMe);
    }

    static getOthers(clients) {
        return clients.filter(c => !c.isMe);
    }
}
