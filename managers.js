import { safeGetElement, safeSetTextContent } from './utils.js';
import { appState } from './state.js';
import { joinRoom } from './main.js';

export class NotificationManager {
    constructor() {
        this.audioContext = null;
        this.audioInitialized = false;
        this.sounds = {
            join: this.createSound(800, 0.1, 'sine'),
            leave: this.createSound(400, 0.1, 'sine'),
            win: this.createSound([523, 659, 784], 0.2, 'sine'),
            turn: this.createSound(600, 0.1, 'square'),
            submit: this.createSound(700, 0.05, 'triangle')
        };
    }

    async initAudioContext() {
        if (this.audioInitialized || !appState.notifications.audio) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (this.audioContext.state === 'suspended') await this.audioContext.resume();
            this.audioInitialized = true;
        } catch (error) {
            console.warn('Audio context initialization failed:', error);
            this.audioInitialized = false;
        }
    }

    createSound(frequency, duration, type = 'sine') {
        return async () => {
            if (!appState.notifications.audio || !this.audioContext || !this.audioInitialized) return;
            try {
                const frequencies = Array.isArray(frequency) ? frequency : [frequency];
                frequencies.forEach((freq, index) => {
                    setTimeout(() => {
                        try {
                            const oscillator = this.audioContext.createOscillator();
                            const gainNode = this.audioContext.createGain();
                            oscillator.connect(gainNode);
                            gainNode.connect(this.audioContext.destination);
                            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                            oscillator.type = type;
                            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
                            oscillator.start();
                            oscillator.stop(this.audioContext.currentTime + duration);
                        } catch (e) { console.warn('Sound generation failed:', e); }
                    }, index * 150);
                });
            } catch (error) { console.warn('Audio playback failed:', error); }
        };
    }

    show(message, type = 'info', duration = 3000) {
        if (!appState.notifications.visual) return;
        try {
            const notificationEl = safeGetElement('notification');
            if (!notificationEl) return;
            notificationEl.textContent = message;
            notificationEl.className = `notification ${type}`;
            notificationEl.classList.add('show');
            setTimeout(() => notificationEl.classList.remove('show'), duration);
            this.playSound(type);
        } catch (error) { console.warn('Notification display failed:', error); }
    }

    async playSound(type) {
        switch (type) {
            case 'success': await this.sounds.win(); break;
            case 'error': await this.sounds.leave(); break;
            default: await this.sounds.turn();
        }
    }

    async playerJoined(playerName) { this.show(`${playerName} joined the game`, 'success'); await this.sounds.join(); }
    async playerLeft(playerName) { this.show(`${playerName} left the game`, 'error'); await this.sounds.leave(); }
    async roundWinner(playerName) { this.show(`${playerName} wins this round!`, 'success'); await this.sounds.win(); }
    async yourTurn() { this.show('Your turn to submit cards!', 'info'); await this.sounds.turn(); }
    async cardsSubmitted() { this.show('Cards submitted!', 'success'); await this.sounds.submit(); }
    async gameStarted() { this.show('Game started!', 'success'); await this.sounds.win(); }
    async judgeSelection() { this.show('You are the judge!', 'info'); await this.sounds.turn(); }
}

export class QRCodeGenerator {
    generateQR(text, canvas) {
        const size = 200;
        const qrSize = 25;
        const modules = this.generateQRMatrix(text, qrSize);
        const ctx = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = size;
        const moduleSize = size / qrSize;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        
        ctx.fillStyle = '#000000';
        for (let y = 0; y < qrSize; y++) {
            for (let x = 0; x < qrSize; x++) {
                if (modules[y][x]) {
                    ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
                }
            }
        }
    }

    generateQRMatrix(text, size) {
        const modules = Array(size).fill().map(() => Array(size).fill(false));
        this.addFinderPattern(modules, 0, 0);
        this.addFinderPattern(modules, 0, size - 7);
        this.addFinderPattern(modules, size - 7, 0);
        for (let i = 8; i < size - 8; i++) {
            modules[6][i] = i % 2 === 0;
            modules[i][6] = i % 2 === 0;
        }
        const data = this.encodeData(text);
        this.placeData(modules, data, size);
        return modules;
    }

    addFinderPattern(modules, startX, startY) {
        const pattern = [ [1,1,1,1,1,1,1], [1,0,0,0,0,0,1], [1,0,1,1,1,0,1], [1,0,1,1,1,0,1], [1,0,1,1,1,0,1], [1,0,0,0,0,0,1], [1,1,1,1,1,1,1] ];
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                if (startX + i < modules.length && startY + j < modules[0].length) {
                    modules[startX + i][startY + j] = pattern[i][j] === 1;
                }
            }
        }
    }

    encodeData(text) {
        let binary = '';
        for (let i = 0; i < text.length; i++) {
            binary += text.charCodeAt(i).toString(2).padStart(8, '0');
        }
        return binary;
    }

    placeData(modules, data, size) {
        let dataIndex = 0;
        let up = true;
        for (let col = size - 1; col > 0; col -= 2) {
            if (col === 6) col--;
            for (let row = 0; row < size; row++) {
                const y = up ? size - 1 - row : row;
                for (let c = 0; c < 2; c++) {
                    const x = col - c;
                    if (!this.isReserved(y, x, size) && dataIndex < data.length) {
                        modules[y][x] = data[dataIndex] === '1';
                        dataIndex++;
                    }
                }
            }
            up = !up;
        }
    }

    isReserved(x, y, size) {
        if ((x < 8 && y < 8) || (x < 8 && y >= size - 8) || (x >= size - 8 && y < 8)) return true;
        if (x === 6 || y === 6) return true;
        return false;
    }
}

export class QRCodeScanner {
    constructor() {
        this.video = null; this.canvas = null; this.context = null;
        this.scanning = false; this.stream = null; this.animationFrameId = null;
    }

    async startCamera() {
        try {
            this.video = safeGetElement('qrVideo');
            this.canvas = safeGetElement('qrScanCanvas');
            if (!this.video || !this.canvas) return false;
            this.context = this.canvas.getContext('2d');
            
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.updateScannerStatus('Camera not supported.'); return false;
            }
            
            this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            this.video.srcObject = this.stream;
            this.scanning = true;
            
            this.video.onloadedmetadata = () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.scanFrame();
            };
            return true;
        } catch (error) {
            console.error('Camera access denied:', error);
            this.updateScannerStatus('Camera access denied.');
            return false;
        }
    }

    updateScannerStatus(message) { safeSetTextContent('scannerStatus', message); }

    scanFrame() {
        if (!this.scanning || !this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.animationFrameId = requestAnimationFrame(() => this.scanFrame());
            return;
        }
        
        this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });

        if (code) {
            this.handleQRCodeDetected(code.data);
        } else {
            this.animationFrameId = requestAnimationFrame(() => this.scanFrame());
        }
    }

    handleQRCodeDetected(qrData) {
        this.stopCamera();
        this.updateScannerStatus('QR Code detected!');
        try {
            const url = new URL(qrData);
            const roomCode = url.searchParams.get('room');
            if (roomCode) {
                safeGetElement('roomCode').value = roomCode;
                window.closeQRScanner();
                window.notifications.show(`Room code detected: ${roomCode}`, 'success');
                joinRoom();
            }
        } catch (error) {
            window.notifications.show("Invalid QR code data.", "error");
        }
    }

    async scanImageFile(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code) {
                    this.handleQRCodeDetected(code.data);
                    resolve(code.data);
                } else {
                    window.notifications.show('No QR code found in image.', 'error');
                    reject('No QR code found');
                }
            };
            img.onerror = () => reject('Failed to load image');
            img.src = URL.createObjectURL(file);
        });
    }

    stopCamera() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.scanning = false;
        if (this.stream) this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
        if (this.video) this.video.srcObject = null;
    }
}
