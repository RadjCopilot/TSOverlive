class TS6Parser {
    static parseConnection(conn, myClientId) {
        const myClient = conn.clientInfos?.find(c => c.id === myClientId);
        if (!myClient) return null;

        const channelId = myClient.channelId;
        const channelInfos = conn.channelInfos || {};
        
        const findChannel = (channels, id) => {
            if (!channels) return null;
            for (const ch of channels) {
                if (ch && ch.id === id) return ch;
                if (ch?.subChannels) {
                    const found = findChannel(ch.subChannels, id);
                    if (found) return found;
                }
            }
            return null;
        };
        
        const channel = findChannel(channelInfos.rootChannels, channelId);
        const channelName = channel?.properties?.name || '';
        
        const clients = conn.clientInfos
            .filter(c => c.channelId === channelId)
            .map(c => ({
                id: c.id,
                name: c.properties?.nickname || 'Unknown',
                isSpeaking: c.properties?.flagTalking || false,
                isMe: c.id === myClientId
            }));

        return {
            clients,
            channelId,
            channelName
        };
    }

    static parseAuthMessage(msg) {
        if (msg.type !== 'auth' || msg.status?.code !== 0) return null;

        return {
            apiKey: msg.payload?.apiKey,
            connection: msg.payload?.connections?.[0]
        };
    }

    static parseConnectStatus(msg) {
        if (msg.type !== 'connectStatusChanged') return null;

        const status = msg.payload?.status;
        return {
            isConnected: status === 3,
            isDisconnected: status === 4 || status === 0
        };
    }

    static parseTalkStatus(msg) {
        if (msg.type !== 'talkStatusChanged') return null;

        return {
            clientId: msg.payload?.clientId,
            isSpeaking: msg.payload?.status === 1
        };
    }

    static parseClientMoved(msg) {
        if (msg.type !== 'clientMoved') return null;

        return {
            clientId: msg.payload?.clientId,
            newChannelId: msg.payload?.newChannelId
        };
    }

    static parseClientUpdated(msg) {
        if (msg.type !== 'clientUpdated') return null;

        return {
            clientId: msg.payload?.clientId,
            nickname: msg.payload?.properties?.nickname,
            inputMuted: msg.payload?.properties?.inputMuted
        };
    }
}
