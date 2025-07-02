import { gameState, appState, networkState } from './state.js';
import { safeGetElement, safeSetTextContent, safeSetInnerHTML } from './utils.js';
import { themes, cardDatabase, devCardDatabase } from './cards.js';

export function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    safeGetElement(screenId).classList.add('active');
}

export function updateLobby() {
    safeSetTextContent('currentRoomCode', gameState.room);
    const playersElement = safeGetElement('lobbyPlayers');
    playersElement.innerHTML = '';
    gameState.players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player-card';
        playerElement.innerHTML = `<strong>${player.name}</strong> ${player.id === gameState.currentPlayer.id ? '(You)' : ''} ${networkState.hostId === player.id ? '(Host)' : ''}`;
        playersElement.appendChild(playerElement);
    });
    safeGetElement('startGameBtn').disabled = !networkState.isHost || gameState.players.length < 2;
    updateExpansionSelector();
}

export function updateGameUI() {
    if(gameState.phase !== 'game') return;
    safeSetTextContent('currentRound', gameState.currentRound);
    safeSetInnerHTML('blackCard', `<p>${gameState.blackCard.text.replace(/_/g, '______')}</p>`);
    updateHand();
    updateSubmissions();
    updateScoreboard();
}

export function updateHand() {
    const handElement = safeGetElement('playerHand');
    handElement.innerHTML = '';
    gameState.hand.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card white-card';
        cardElement.innerHTML = `<p>${card}</p>`;
        if (gameState.judge !== gameState.currentPlayer.id) {
            cardElement.onclick = () => window.selectCard(index);
        }
        if(gameState.selectedCards.includes(index)) cardElement.classList.add('selected');
        handElement.appendChild(cardElement);
    });
    updateSubmitButton();
}

export function updateSubmitButton() {
    const submitBtn = safeGetElement('submitBtn');
    const alreadySubmitted = gameState.submissions.some(s => s.player === gameState.currentPlayer.id);
    submitBtn.disabled = alreadySubmitted || gameState.selectedCards.length !== (gameState.blackCard?.pick || 0) || gameState.judge === gameState.currentPlayer.id;
}

export function updateSubmissions() {
    const submissionsElement = safeGetElement('submissions');
    submissionsElement.innerHTML = '';
    gameState.submissions.forEach((submission, index) => {
        const submissionElement = document.createElement('div');
        submissionElement.className = 'card white-card';
        submissionElement.innerHTML = submission.cards.map(card => `<p>${card}</p>`).join('');
        if (networkState.isHost && gameState.judge === gameState.currentPlayer.id) {
            submissionElement.style.cursor = 'pointer';
            submissionElement.onclick = () => window.selectWinner(index);
        }
        submissionsElement.appendChild(submissionElement);
    });
}

export function updateScoreboard() {
    const scoreboardElement = safeGetElement('scoreboard');
    scoreboardElement.innerHTML = '<h3>Scoreboard</h3>';
    const sortedPlayers = [...gameState.players].sort((a, b) => (gameState.scores[b.id] || 0) - (gameState.scores[a.id] || 0));
    sortedPlayers.forEach(player => {
        const score = gameState.scores[player.id] || 0;
        const isJudge = player.id === gameState.judge;
        scoreboardElement.innerHTML += `<div class="player-card ${isJudge ? 'judge' : ''}"><strong>${player.name}</strong> ${isJudge ? '(Judge)' : ''}<br>Score: ${score}</div>`;
    });
}

export function updateExpansionSelector() {
    const expansionElement = safeGetElement('expansionSelector');
    expansionElement.innerHTML = '<h4>Select Card Packs:</h4>';
    const allDecks = {...cardDatabase, ...(gameState.devMode && {dev: devCardDatabase.dev})};
    
    Object.keys(allDecks).forEach(key => {
        const deck = allDecks[key];
        const card = document.createElement('div');
        card.className = 'expansion-card';
        if (gameState.selectedExpansions.includes(key)) card.classList.add('selected');
        card.innerHTML = `<h4>${deck.name}</h4><p>${deck.black.length} black</p><p>${deck.white.length} white</p>`;
        card.onclick = () => window.toggleExpansion(key);
        expansionElement.appendChild(card);
    });
}

export function addChatMessage(player, message) {
    const chatMessages = safeGetElement('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    messageElement.innerHTML = `<strong>${player}:</strong> ${message}`;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

export function updateConnectionStatus(status) {
    const el = safeGetElement('connectionStatus');
    el.textContent = status;
    el.className = 'connection-status';
    if (status.includes('Connected') || status.includes('Host')) el.classList.add('connected');
    else if (status.includes('...')) el.classList.add('connecting');
    else el.classList.add('disconnected');
}

export function showConnectionProgress(message) {
    safeGetElement('connectionProgressContainer').style.display = 'block';
    safeSetTextContent('connectionProgress', message);
}

export function hideConnectionProgress() {
    safeGetElement('connectionProgressContainer').style.display = 'none';
}

export function showQRScanner() { safeGetElement('qrScannerModal').classList.add('active'); }
export function closeQRScanner() {
    window.qrScanner.stopCamera();
    safeGetElement('qrScannerModal').classList.remove('active');
    safeGetElement('cameraScanner').classList.add('hidden');
    safeGetElement('qrDropZone').classList.add('hidden');
}

export function showDropZone() {
    const dropZone = safeGetElement('qrDropZone');
    dropZone.classList.remove('hidden');
    dropZone.onclick = () => safeGetElement('qrFileInput').click();
}

export function generateRoomQR(fullRoomCode) {
    const canvas = safeGetElement('qrCanvas');
    const currentUrl = window.location.href.split('?')[0];
    const roomUrl = `${currentUrl}?room=${fullRoomCode}`;
    window.qrGenerator.generateQR(roomUrl, canvas);
}

export function showSettings() {
    // ... implementation in main.js
}

export function closeSettings() {
    safeGetElement('settingsModal').classList.remove('active');
}

export function showCardEditor() {
    // ... implementation in main.js
}

export function closeCardEditor() {
    safeGetElement('cardEditorModal').classList.remove('active');
}

export function updateCustomCardsList() {
    // ... implementation in main.js
}

export function showThemeSelector() {
    showSettings();
    setTimeout(() => safeGetElement('themeSelectorContainer').scrollIntoView({ behavior: 'smooth' }), 100);
}

export function createThemeSelector() {
    const selector = safeGetElement('themeSelectorContainer');
    selector.innerHTML = '';
    const sortedThemes = Object.entries(themes).sort((a, b) => a[1].rank - b[1].rank);
    sortedThemes.forEach(([key, theme]) => {
        const option = document.createElement('div');
        option.className = 'theme-option';
        if (appState.theme === key) option.classList.add('selected');
        option.innerHTML = `<div class="theme-preview" style="background: ${theme.preview}"></div><strong>${theme.name}</strong>`;
        option.onclick = () => {
            document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            window.setTheme(key);
        };
        selector.appendChild(option);
    });
}

export function toggleAttribution() { safeGetElement('attributionFooter').classList.toggle('minimized'); }
export function initializeAttribution() { /* Now minimized by default in HTML */ }

export function getMethodDisplayName(method) {
    const names = { 'cloud-sync': 'Cloud Sync', 'pure-webrtc': 'Pure P2P' };
    return names[method] || method;
}
