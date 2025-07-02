export let gameState = {
    phase: 'home', // home, lobby, game, ended
    players: [],
    currentPlayer: null,
    isHost: false,
    room: null,
    currentRound: 1,
    judge: null,
    blackCard: null,
    submissions: [],
    hand: [],
    selectedCards: [],
    scores: {},
    winningScore: 7,
    selectedExpansions: ['base'],
    devMode: false
};

export let appState = {
    theme: 'midnight-gaming',
    notifications: { enabled: true, audio: true, visual: true }
};

export let networkState = {
    method: 'cloud-sync',
    connections: new Map(),
    localId: null, // Will be set on init
    isHost: false,
    hostId: null,
    dataChannels: new Map(),
    signaling: null,
    pollingInterval: null
};

export const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};
