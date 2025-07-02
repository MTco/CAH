import { gameState, appState, networkState, rtcConfig } from './state.js';
import { safeJsonParse } from './utils.js';

class JsonBlobSignaling {
    constructor() {
        this.baseUrl = 'https://jsonblob.com/api/jsonBlob';
    }

    async createRoom(initialData) {
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(initialData)
            });
            if (!response.ok) throw new Error(`API error: ${response.statusText}`);
            const location = response.headers.get('Location');
            if (!location) throw new Error('Location header not found in response');
            return location.split('/').pop();
        } catch (error) {
            console.error('Failed to create jsonblob.com room:', error);
            window.notifications.show('Could not create signaling room.', 'error');
            return null;
        }
    }

    async getRoomData(binId) {
        try {
            const response = await fetch(`${this.baseUrl}/${binId}`);
            if (response.status === 404) return null;
            if (!response.ok) throw new Error(`API error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('Failed to get room data:', error);
            return null;
        }
    }

    async updateRoomData(binId, data) {
        try {
            const response = await fetch(`${this.baseUrl}/${binId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.ok;
        } catch (error) {
            console.error('Failed to update room data:', error);
            return false;
        }
    }
}

class WebRTCManager {
    constructor(networkMgr) {
        this.networkManager = networkMgr;
        this.iceCandidateQueues = new Map();
    }

    async createPeerConnection(peerId = null, isInitiator = false) {
        const pc = new RTCPeerConnection(rtcConfig);
        this.iceCandidateQueues.set(peerId, []);

        pc.onicecandidate = event => {
            if (event.candidate) {
                if (networkState.method === 'cloud-sync') {
                    this.networkManager.sendSignal(peerId, { type: 'candidate', candidate: event.candidate });
                }
            }
        };
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
                this.handlePeerDisconnection(peerId);
            }
        };
        pc.ondatachannel = event => this.setupDataChannel(event.channel, peerId);
        
        if(isInitiator) {
            const dataChannel = pc.createDataChannel('game');
            this.setupDataChannel(dataChannel, peerId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            return { pc, offer };
        }
        return pc;
    }

    async connectToPeer(peerId) {
        if (networkState.connections.has(peerId)) return;
        const { pc, offer } = await this.createPeerConnection(peerId, true);
        networkState.connections.set(peerId, pc);
        if (networkState.method === 'cloud-sync') {
            this.networkManager.sendSignal(peerId, { type: 'offer', sdp: offer.sdp });
        }
    }

    async handleSignalingMessage(fromId, data) {
        let pc = networkState.connections.get(fromId);
        if (!pc && data.type === 'offer') {
            pc = await this.createPeerConnection(fromId);
            networkState.connections.set(fromId, pc);
        }
        try {
            if (data.type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                this.networkManager.sendSignal(fromId, { type: 'answer', sdp: answer.sdp });
                this.processIceQueue(fromId, pc);
            } else if (data.type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                this.processIceQueue(fromId, pc);
            } else if (data.type === 'candidate') {
                if(pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } else {
                    this.iceCandidateQueues.get(fromId).push(data.candidate);
                }
            }
        } catch (error) { console.error(`Error handling signal from ${fromId}:`, error); }
    }
    
    async processIceQueue(peerId, pc) {
        const queue = this.iceCandidateQueues.get(peerId);
        if (queue) {
            while (queue.length) {
                const candidate = queue.shift();
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        }
    }

    async handleOfferFromPeer(peerId, offer) {
        const pc = await this.createPeerConnection(peerId);
        networkState.connections.set(peerId, pc);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        return { pc, answer };
    }

    async handleAnswerFromPeer(peerId, answer) {
        const pc = networkState.connections.get(peerId);
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }

    setupDataChannel(channel, peerId) {
        channel.onopen = () => {
            networkState.dataChannels.set(peerId, channel);
            if (networkState.isHost) {
                this.sendToPeer(peerId, { type: 'full-game-state', state: gameState });
            }
            this.sendToPeer(peerId, { type: 'player-info', player: gameState.currentPlayer });
        };
        channel.onmessage = event => this.handlePeerMessage(peerId, safeJsonParse(event.data));
        channel.onclose = () => this.handlePeerDisconnection(peerId);
        channel.onerror = err => console.error(`Data channel error with ${peerId}:`, err);
    }

    handlePeerMessage(fromId, data) {
        if(!data) return;
        switch (data.type) {
            case 'chat-message': window.addChatMessage(data.playerName, data.message); break;
            case 'full-game-state':
                if (!networkState.isHost) {
                    Object.assign(gameState, data.state);
                    window.updateLobby();
                    window.updateGameUI();
                }
                break;
            case 'player-info':
                if (networkState.isHost) {
                    if (!gameState.players.find(p => p.id === data.player.id)) {
                        gameState.players.push(data.player);
                        window.notifications.playerJoined(data.player.name);
                        this.broadcast({ type: 'game-state-update', players: gameState.players });
                        window.updateLobby();
                    }
                }
                break;
            case 'game-state-update':
                gameState.players = data.players;
                window.updateLobby();
                break;
            case 'player-action': window.handlePlayerAction(fromId, data.action); break;
        }
    }
    
    handlePeerDisconnection(peerId) {
        networkState.connections.delete(peerId);
        networkState.dataChannels.delete(peerId);
        const player = gameState.players.find(p => p.id === peerId);
        if (player) {
            gameState.players = gameState.players.filter(p => p.id !== peerId);
            window.notifications.playerLeft(player.name);
            if (networkState.isHost) {
                this.broadcast({ type: 'game-state-update', players: gameState.players });
            }
            window.updateLobby();
            window.updateScoreboard();
        }
    }

    broadcast(data) {
        const message = JSON.stringify(data);
        for (const channel of networkState.dataChannels.values()) {
            if (channel.readyState === 'open') channel.send(message);
        }
    }
    
    sendToPeer(peerId, data) {
        const channel = networkState.dataChannels.get(peerId);
        if (channel && channel.readyState === 'open') channel.send(JSON.stringify(data));
    }

    disconnect() {
        for (const pc of networkState.connections.values()) pc.close();
        networkState.connections.clear();
        networkState.dataChannels.clear();
    }
}

export class NetworkManager {
    constructor() {
        this.signaling = null;
        this.webrtc = new WebRTCManager(this);
    }

    async createRoom(method) {
        networkState.method = method;
        networkState.isHost = true;
        networkState.hostId = networkState.localId;
        
        if (method === 'cloud-sync') {
            this.signaling = new JsonBlobSignaling();
            const initialData = {
                peers: [{ id: networkState.localId, name: gameState.currentPlayer.name }],
                signals: [],
            };
            const binId = await this.signaling.createRoom(initialData);
            if (!binId) return { success: false };
            networkState.signalingId = binId;
            this.startSignalingPoll();
            return { success: true, roomCode: binId };
        }
        
        const { offer } = await this.webrtc.createPeerConnection(null, true);
        const offerString = JSON.stringify(offer);
        return { success: true, roomCode: btoa(offerString) };
    }

    async joinRoom(method, roomCode) {
        networkState.method = method;
        networkState.isHost = false;

        if (method === 'cloud-sync') {
            this.signaling = new JsonBlobSignaling();
            networkState.signalingId = roomCode;
            const roomData = await this.signaling.getRoomData(roomCode);
            if (!roomData) {
                window.notifications.show('Room not found.', 'error');
                return false;
            }

            const me = { id: networkState.localId, name: gameState.currentPlayer.name };
            if (!roomData.peers.find(p => p.id === me.id)) {
                roomData.peers.push(me);
                await this.signaling.updateRoomData(roomCode, roomData);
            }
            
            this.startSignalingPoll();
            roomData.peers.forEach(peer => {
                if (peer.id !== networkState.localId) {
                    this.webrtc.connectToPeer(peer.id);
                }
            });
            return true;
        }
        
        const offerString = atob(roomCode);
        if(!offerString) return false;
        const offer = safeJsonParse(offerString);
        if(!offer) return false;

        const { answer } = await this.webrtc.handleOfferFromPeer(null, offer);
        const answerString = JSON.stringify(answer);
        const answerCode = btoa(answerString);
        
        const hostAnswerCode = await window.manualRtcPrompt(
            'Your Answer Code',
            'Share this code with the host, then enter their final code below.',
            answerCode
        );
        
        if(hostAnswerCode) {
            const hostAnswer = safeJsonParse(atob(hostAnswerCode));
            if(hostAnswer) this.webrtc.handleAnswerFromPeer(null, hostAnswer);
        }
        return true;
    }

    startSignalingPoll() {
        if (networkState.pollingInterval) clearInterval(networkState.pollingInterval);
        networkState.pollingInterval = setInterval(async () => {
            if (!this.signaling || !networkState.signalingId) return;
            const roomData = await this.signaling.getRoomData(networkState.signalingId);
            if (roomData) {
                roomData.peers.forEach(peer => {
                    if (peer.id !== networkState.localId && !networkState.connections.has(peer.id)) {
                        this.webrtc.connectToPeer(peer.id);
                    }
                });
                const signalsForMe = roomData.signals.filter(s => s.to === networkState.localId);
                if(signalsForMe.length > 0) {
                    signalsForMe.forEach(signal => this.webrtc.handleSignalingMessage(signal.from, signal.data));
                    const remainingSignals = roomData.signals.filter(s => s.to !== networkState.localId);
                    await this.signaling.updateRoomData(networkState.signalingId, {...roomData, signals: remainingSignals});
                }
            }
        }, 3000);
    }

    async sendSignal(to, data) {
        if (!this.signaling || !networkState.signalingId) return;
        const roomData = await this.signaling.getRoomData(networkState.signalingId);
        if (roomData) {
            roomData.signals.push({ from: networkState.localId, to, data });
            await this.signaling.updateRoomData(networkState.signalingId, roomData);
        }
    }

    broadcast(data) { this.webrtc.broadcast(data); }

    disconnect() {
        if (networkState.pollingInterval) clearInterval(networkState.pollingInterval);
        this.webrtc.disconnect();
        this.signaling = null;
        networkState.signalingId = null;
    }
}

export function parseRoomCode(fullCode) {
    if (typeof fullCode !== 'string') return { method: null, code: null };

    if (fullCode.length > 20 && !fullCode.includes('-')) {
        return { method: 'cloud-sync', code: fullCode };
    }
    
    const parts = fullCode.split('-');
    if (parts.length > 0 && METHOD_PREFIXES[parts[0]]) {
        const prefix = parts[0];
        const code = parts.slice(1).join('-');
        const method = METHOD_PREFIXES[prefix];
        return { method, code };
    }

    if (fullCode.length > 20) {
         return { method: 'pure-webrtc', code: fullCode };
    }
    
    return { method: 'cloud-sync', code: fullCode };
}
