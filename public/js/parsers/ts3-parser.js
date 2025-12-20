class TS3Parser {
    static parseParams(line) {
        const params = {};
        const parts = line.split(' ');
        for (const part of parts) {
            const [key, value] = part.split('=');
            if (key && value) {
                params[key] = decodeURIComponent(value.replace(/\\s/g, ' '));
            }
        }
        return params;
    }

    static parseClientList(line, currentChannelId, myClientId) {
        const clients = line.split('|');
        const result = [];

        for (const clientData of clients) {
            const params = this.parseParams(clientData);
            const clientId = parseInt(params.clid);
            const channelId = parseInt(params.cid);

            if (channelId === currentChannelId) {
                result.push({
                    id: clientId,
                    name: params.client_nickname || 'Unknown',
                    isSpeaking: params.client_flag_talking === '1',
                    isMe: clientId === myClientId,
                    inputMuted: params.client_input_muted === '1',
                    outputMuted: params.client_output_muted === '1',
                    away: params.client_away === '1'
                });
            }
        }

        return result;
    }

    static parseWhoAmI(line) {
        const params = this.parseParams(line);
        return {
            clientId: parseInt(params.clid),
            channelId: parseInt(params.cid)
        };
    }

    static parseConnectStatus(line) {
        const params = this.parseParams(line);
        const status = params.status;
        return status === 'connected' || status === '1';
    }

    static parseClientEnter(line) {
        const params = this.parseParams(line);
        return {
            clientId: parseInt(params.clid),
            channelId: parseInt(params.ctid),
            nickname: params.client_nickname || 'Unknown'
        };
    }

    static parseClientLeft(line) {
        const params = this.parseParams(line);
        return {
            clientId: parseInt(params.clid)
        };
    }

    static parseTalkStatus(line) {
        const params = this.parseParams(line);
        return {
            clientId: parseInt(params.clid),
            isSpeaking: parseInt(params.status) === 1
        };
    }

    static parseClientMoved(line) {
        const params = this.parseParams(line);
        return {
            clientId: parseInt(params.clid),
            newChannelId: parseInt(params.ctid)
        };
    }

    static parseClientUpdated(line) {
        const params = this.parseParams(line);
        const result = {
            clientId: parseInt(params.clid)
        };
        if (params.client_nickname !== undefined) {
            result.nickname = params.client_nickname;
        }
        if (params.client_input_muted !== undefined) {
            result.inputMuted = params.client_input_muted === '1';
        }
        if (params.client_output_muted !== undefined) {
            result.outputMuted = params.client_output_muted === '1';
        }
        if (params.client_away !== undefined) {
            result.away = params.client_away === '1';
        }
        return result;
    }
}
