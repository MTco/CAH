import { gameState, appState, networkState } from './state.js';
import * as ui from './ui.js';
import * as network from './network.js';
import * as cards from './cards.js';
import * as managers from './managers.js';
import * as utils from './utils.js';

// --- GLOBAL INSTANCES ---
let notifications, qrGenerator, qrScanner, networkManager;

// --- CORE APP LOGIC ---

function initializeApp() {
    try {
        console.log('Initializing Cards Against Humanity...');
        networkState.localId = utils.generateId();
        initializeManagers();
        ui.loadTheme();
        loadDevMode();
        loadSettings();
        ui.setupQRFileHandling(qrScanner);
        checkUrlParams();
        initializeEventListeners();
        loadPlayerName();
        loadCustomCards();
        ui.updateConnectionStatus('Offline');
        ui.initializeAttribution();
        protectAttribution();
        observeAttribution();
        document.addEventListener('click', () => notifications.initAudioContext(), { once: true });
        console.log('App initialization complete');
    } catch (error) {
        console.error('App initialization failed:', error);
        document.body.innerHTML = '<h1>A critical error occurred. Please refresh the page.</h1>';
    }
}

function initializeManagers() {
    notifications = new managers.NotificationManager();
    window.notifications = notifications; // Make accessible globally for UI events
    qrGenerator = new managers.QRCodeGenerator();
    window.qrGenerator = qrGenerator;
    qrScanner = new managers.QRCodeScanner((roomCode) => {
        utils.safeGetElement('roomCode').value = roomCode;
        ui.closeQRScanner();
        notifications.show(`Room code detected: ${roomCode}`, 'success');
        joinRoom();
    });
    networkManager = new network.NetworkManager();
    window.networkManager = networkManager; // For debugging
}

async function createRoom() {
    const name = utils.safeGetElement('playerName').value.trim();
    if (!name) {
        notifications.show('Please enter your name', 'error');
        return;
    }
    
    const method = utils.safeGetElement('connectionMethod').value;
    gameState.currentPlayer = { id: networkState.localId, name: name };
    gameState.players.push(gameState.currentPlayer);
    ui.showConnectionProgress('Creating room...');
    
    const { success, roomCode } = await networkManager.createRoom(method);
    
    if (success) {
        const prefix = network.METHOD_PREFIXES[method] || 'C';
        const fullRoomCode = method === 'cloud-sync' ? roomCode : `${prefix}-${roomCode}`;
        gameState.room = fullRoomCode;
        utils.safeGetElement('roomCode').value = fullRoomCode;
        savePlayerName(name);
        
        if (method === 'pure-webrtc') {
            const answerCode = await ui.manualRtcPrompt('Room Created (Manual)', 'Share this code with the joining player, then enter their answer code below.', roomCode);
            if(answerCode) {
                const answer = utils.safeJsonParse(atob(answerCode));
                if(answer) networkManager.webrtc.handleAnswerFromPeer(null, answer);
            } else {
                leaveRoom();
                return;
            }
        }

        ui.hideConnectionProgress();
        ui.switchScreen('lobbyScreen');
        ui.updateLobby();
        ui.updateConnectionStatus(`Host (${ui.getMethodDisplayName(method)})`);
        ui.generateRoomQR(fullRoomCode);
        notifications.show('Room created! Share the code.', 'success');
    } else {
        ui.hideConnectionProgress();
        notifications.show('Failed to create room.', 'error');
        ui.updateConnectionStatus('Failed');
    }
}

async function joinRoom() {
    const name = utils.safeGetElement('playerName').value.trim();
    const fullRoomCode = utils.safeGetElement('roomCode').value.trim();
    if (!name || !fullRoomCode) {
        notifications.show('Please enter your name and a valid room code', 'error');
        return;
    }

    const { method, code } = network.parseRoomCode(fullRoomCode);
    
    if (!method || !code) {
        notifications.show('Invalid room code format.', 'error');
        return;
    }

    gameState.currentPlayer = { id: networkState.localId, name: name };
    gameState.room = fullRoomCode;
    
    ui.showConnectionProgress(`Joining room with ${ui.getMethodDisplayName(method)}...`);
    
    const success = await networkManager.joinRoom(method, code);
    if (success) {
        savePlayerName(name);
        ui.hideConnectionProgress();
        ui.switchScreen('lobbyScreen');
        ui.updateLobby();
        ui.updateConnectionStatus(`Connected (${ui.getMethodDisplayName(method)})`);
    } else {
        ui.hideConnectionProgress();
        ui.updateConnectionStatus('Failed');
    }
}

function leaveRoom() {
    networkManager.disconnect();
    Object.assign(gameState, { phase: 'home', players: [], isHost: false, room: null });
    networkState.isHost = false;
    networkState.hostId = null;
    ui.switchScreen('homeScreen');
    ui.updateConnectionStatus('Offline');
}

function startGame() {
    if (!networkState.isHost || gameState.players.length < 2) {
        notifications.show('Need at least 2 players to start', 'error');
        return;
    }
    
    gameState.phase = 'game';
    gameState.winningScore = parseInt(utils.safeGetElement('winningScore').value);
    gameState.players.forEach(p => { gameState.scores[p.id] = 0; });
    gameState.judge = gameState.players[0].id;
    
    dealInitialCards();
    startRound();
    
    networkManager.broadcast({ type: 'game-state', state: { ...gameState, hand: null } });
    
    ui.switchScreen('gameScreen');
}

function startRound() {
    const blackCards = cards.getAllBlackCards();
    gameState.blackCard = blackCards[Math.floor(Math.random() * blackCards.length)];
    gameState.submissions = [];
    gameState.selectedCards = [];
    ui.updateGameUI();
    utils.safeSetTextContent('gameStatus', gameState.judge === gameState.currentPlayer.id ? 'You are the judge! Wait for submissions.' : `Submit ${gameState.blackCard.pick} card(s)`);
}

function nextRound() {
    gameState.currentRound++;
    const currentJudgeIndex = gameState.players.findIndex(p => p.id === gameState.judge);
    gameState.judge = gameState.players[(currentJudgeIndex + 1) % gameState.players.length].id;
    startRound();
    if (networkState.isHost) {
        networkManager.broadcast({ type: 'game-state', state: { ...gameState, hand: null } });
    }
}

function dealInitialCards() {
    const whiteCards = cards.getAllWhiteCards();
    gameState.hand = [];
    for (let i = 0; i < 10; i++) {
        gameState.hand.push(whiteCards[Math.floor(Math.random() * whiteCards.length)]);
    }
    ui.updateHand();
}

function submitCards() {
    if (gameState.selectedCards.length !== gameState.blackCard.pick) return;
    const submittedCards = gameState.selectedCards.map(index => gameState.hand[index]);
    
    gameState.selectedCards.sort((a, b) => b - a).forEach(index => gameState.hand.splice(index, 1));
    
    const whiteCards = cards.getAllWhiteCards();
    for (let i = 0; i < gameState.selectedCards.length; i++) {
        gameState.hand.push(whiteCards[Math.floor(Math.random() * whiteCards.length)]);
    }
    
    gameState.selectedCards = [];
    const submission = { player: gameState.currentPlayer.id, cards: submittedCards };
    
    networkManager.broadcast({ type: 'player-action', action: { type: 'submit-cards', ...submission } });
    handlePlayerAction(gameState.currentPlayer.id, { type: 'submit-cards', ...submission });
}

export function handlePlayerAction(fromId, action) {
    if (action.type === 'submit-cards') {
        if (!gameState.submissions.find(s => s.player === fromId)) {
            gameState.submissions.push({ player: fromId, cards: action.cards });
            ui.updateSubmissions();
            checkAllSubmissionsReceived();
        }
    }
}

function checkAllSubmissionsReceived() {
    const nonJudgePlayers = gameState.players.filter(p => p.id !== gameState.judge);
    if (gameState.submissions.length >= nonJudgePlayers.length) {
        utils.safeSetTextContent('gameStatus', networkState.isHost ? 'Choose the funniest answer!' : 'Judge is choosing...');
    }
}

function selectWinner(index) {
    if (!networkState.isHost || gameState.judge !== gameState.currentPlayer.id) return;

    const winner = gameState.submissions[index];
    gameState.scores[winner.player]++;
    const winnerName = gameState.players.find(p => p.id === winner.player)?.name || 'Unknown';
    
    notifications.roundWinner(winnerName);
    
    if (gameState.scores[winner.player] >= gameState.winningScore) {
        setTimeout(() => {
            notifications.show(`${winnerName} wins the game!`, 'success');
            networkManager.broadcast({ type: 'game-over', winner: winnerName });
            leaveRoom();
        }, 3000);
    } else {
        setTimeout(() => nextRound(), 3000);
    }
}

function sendMessage() {
    const input = utils.safeGetElement('chatInput');
    const message = input.value.trim();
    if (!message) return;
    const chatData = { type: 'chat-message', playerName: gameState.currentPlayer.name, message: message };
    networkManager.broadcast(chatData);
    ui.addChatMessage(chatData.playerName, chatData.message);
    input.value = '';
}

// --- INITIALIZATION & HELPERS ---

function initializeEventListeners() {
    utils.safeGetElement('createRoomBtn').addEventListener('click', createRoom);
    utils.safeGetElement('joinRoomBtn').addEventListener('click', joinRoom);
    utils.safeGetElement('scanQRBtn').addEventListener('click', ui.showQRScanner);
    utils.safeGetElement('customCardsBtn').addEventListener('click', ui.showCardEditor);
    utils.safeGetElement('settingsBtn').addEventListener('click', ui.showSettings);
    utils.safeGetElement('themeToggle').addEventListener('click', ui.showThemeSelector);
    utils.safeGetElement('devModeToggle').addEventListener('click', () => toggleDevMode());
    utils.safeGetElement('startGameBtn').addEventListener('click', startGame);
    utils.safeGetElement('submitBtn').addEventListener('click', submitCards);
    utils.safeGetElement('sendMessageBtn').addEventListener('click', sendMessage);
    utils.safeGetElement('leaveRoomBtnLobby').addEventListener('click', leaveRoom);
    utils.safeGetElement('leaveRoomBtnGame').addEventListener('click', leaveRoom);
    utils.safeGetElement('addCustomCardBtn').addEventListener('click', addCustomCard);
    utils.safeGetElement('exportCardsBtn').addEventListener('click', exportCards);
    utils.safeGetElement('importCardsBtn').addEventListener('click', importCards);
    utils.safeGetElement('closeCardEditorBtn').addEventListener('click', ui.closeCardEditor);
    utils.safeGetElement('saveSettingsBtn').addEventListener('click', saveSettings);
    utils.safeGetElement('closeSettingsBtn').addEventListener('click', ui.closeSettings);
    utils.safeGetElement('attributionHeader').addEventListener('click', ui.toggleAttribution);
    utils.safeGetElement('copyManualCodeBtn').addEventListener('click', ui.copyManualCode);

    // QR Scanner Modal buttons
    utils.safeGetElement('startCameraScannerBtn').addEventListener('click', () => qrScanner.startCamera());
    utils.safeGetElement('uploadQRBtn').addEventListener('click', () => utils.safeGetElement('qrFileInput').click());
    utils.safeGetElement('showDropZoneBtn').addEventListener('click', ui.showDropZone);
    utils.safeGetElement('stopCameraScannerBtn').addEventListener('click', () => qrScanner.stopCamera());
    utils.safeGetElement('closeQRScannerBtn').addEventListener('click', ui.closeQRScanner);
    
    utils.safeGetElement('importFile').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const imported = utils.safeJsonParse(e.target.result);
                if(!imported) throw new Error("Invalid JSON file");
                const existing = getCustomCards();
                if (imported.black) existing.black.push(...imported.black);
                if (imported.white) existing.white.push(...imported.white);
                saveCustomCards(existing);
                ui.updateCustomCardsList();
                notifications.show('Cards imported!', 'success');
            } catch (err) { notifications.show('Error importing cards.', 'error'); }
        };
        reader.readAsText(file);
    });
    utils.safeGetElement('newCardType').addEventListener('change', function() {
        utils.safeGetElement('pickGroup').style.display = this.value === 'black' ? 'block' : 'none';
    });
}

async function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    if (roomCode) {
        const join = await ui.customConfirm(`Join room ${roomCode}?`);
        if (join) {
            utils.safeGetElement('roomCode').value = roomCode;
            loadPlayerName();
            joinRoom();
        }
    }
}

// --- SETTINGS & CUSTOM CARDS ---

function saveSettings() {
    const settings = {
        enableCustomCards: utils.safeGetElement('enableCustomCards').checked,
    };
    appState.notifications.enabled = utils.safeGetElement('enableNotifications').checked;
    appState.notifications.audio = utils.safeGetElement('enableAudioNotifications').checked;
    appState.notifications.visual = utils.safeGetElement('enableVisualNotifications').checked;
    gameState.devMode = utils.safeGetElement('enableDevMode').checked;
    
    utils.safeLocalStorageSetJSON('cah-settings', settings);
    utils.safeLocalStorageSetJSON('cah-notifications', appState.notifications);
    utils.safeLocalStorageSet('cah-dev-mode', gameState.devMode);
    
    toggleDevMode(gameState.devMode, true); // Update UI without toggling logic
    ui.closeSettings();
    notifications.show('Settings saved!', 'success');
}

function addCustomCard() {
    const type = utils.safeGetElement('newCardType').value;
    const text = utils.safeGetElement('newCardText').value.trim();
    if (!text) {
        notifications.show('Please enter card text', 'error');
        return;
    }
    const pick = parseInt(utils.safeGetElement('newCardPick').value);
    const customCards = getCustomCards();
    if (type === 'black') {
        customCards.black.push({ text, pick });
    } else {
        customCards.white.push(text);
    }
    saveCustomCards(customCards);
    ui.updateCustomCardsList();
    utils.safeGetElement('newCardText').value = '';
    notifications.show('Card added!', 'success');
}

function exportCards() {
    const blob = new Blob([JSON.stringify(getCustomCards(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cah-custom-cards.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importCards() { utils.safeGetElement('importFile').click(); }

function toggleDevMode(forceState, quiet = false) {
    gameState.devMode = forceState !== undefined ? forceState : !gameState.devMode;
    const devToggle = utils.safeGetElement('devModeToggle');
    devToggle.classList.toggle('active', gameState.devMode);
    if (gameState.devMode) {
        devToggle.textContent = 'DEV ✓';
        devToggle.style.background = '#27ae60';
        if (!quiet) notifications.show('Dev mode enabled', 'success');
    } else {
        devToggle.textContent = 'DEV';
        devToggle.style.background = 'var(--danger-color)';
        if (!quiet) notifications.show('Dev mode disabled', 'info');
    }
    if (gameState.phase === 'lobby') ui.updateExpansionSelector();
    utils.safeLocalStorageSet('cah-dev-mode', gameState.devMode);
}

// --- LOCAL STORAGE & SAFE ACCESSORS ---

function loadPlayerName() { utils.safeGetElement('playerName').value = utils.safeLocalStorageGet('cah-player-name', 'Player'); }
function savePlayerName(name) { utils.safeLocalStorageSet('cah-player-name', name); }
export function getCustomCards() { return utils.safeLocalStorageGetJSON('cah-custom-cards', { black: [], white: [] }); }
function saveCustomCards(cards) { utils.safeLocalStorageSetJSON('cah-custom-cards', cards); }
function loadCustomCards() { if (!localStorage.getItem('cah-custom-cards')) saveCustomCards({ black: [], white: [] }); }
export function getSettings() { return utils.safeLocalStorageGetJSON('cah-settings', { enableCustomCards: true }); }
function loadSettings() {
    if (!localStorage.getItem('cah-settings')) utils.safeLocalStorageSetJSON('cah-settings', { enableCustomCards: true });
    appState.notifications = utils.safeLocalStorageGetJSON('cah-notifications', { enabled: true, audio: true, visual: true });
}
function loadDevMode() { toggleDevMode(utils.safeLocalStorageGet('cah-dev-mode') === 'true', true); }

// --- ATTRIBUTION & COPYRIGHT (DO NOT REMOVE) ---

function initializeCopyright() {
    console.log("%c© All Rights Reserved - Mathew Tyler", "color: #ff0000; font-size: 20px; font-weight: bold;");
    console.log("%cUnauthorized modification, reproduction, or redistribution is prohibited.", "color: #ff0000; font-size: 14px;");
    console.log("%cWebsite: https://tylerpresident.com | https://fakegov.com", "color: #4CAF50; font-size: 14px;");
}
function protectAttribution() {
    setInterval(() => {
        const footer = utils.safeGetElement('attributionFooter');
        if (footer) {
            const styles = window.getComputedStyle(footer);
            if (styles.display === 'none' || styles.visibility === 'hidden') location.reload();
        } else { location.reload(); }
    }, 2000);
}
function observeAttribution() {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.removedNodes.forEach(node => {
                if (node.id === 'attributionFooter') location.reload();
            });
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// --- STARTUP ---

window.addEventListener('error', e => console.error('Global error caught:', e.error));
window.addEventListener('unhandledrejection', e => console.error('Unhandled promise rejection:', e.reason));
document.addEventListener('DOMContentLoaded', initializeApp);
