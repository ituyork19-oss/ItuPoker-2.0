// ItuPoker 2.0 HQ Sound Engine
// Using High-Fidelity Audio Assets for a Premium Casino Experience

const SOUND_PATHS = {
    CARD_DEAL: '/assets/sounds/hq/card-deal.mp3',
    CHIP_BET: '/assets/sounds/hq/chip-bet.mp3',
    FOLD: '/assets/sounds/hq/fold.mp3',
    CHECK: '/assets/sounds/hq/check.mp3',
    WIN: '/assets/sounds/hq/win-celebration.mp3',
    EPIC_WIN: '/assets/sounds/hq/epic-win.mp3',
    CLICK: '/assets/sounds/hq/ui-click.mp3',
    HOVER: '/assets/sounds/hq/ui-hover.mp3',
    NOTIFICATION: '/assets/sounds/hq/notification.mp3',
    AMBIENT_LOUNGE: '/assets/sounds/hq/ambient-lounge.mp3'
};

// Fallback to Web Audio API oscillators if assets are missing
let audioCtx = null;
const initAudio = () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
};

class SoundManager {
    constructor() {
        this.enabled = true;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.currentMusic = null;
        this.cache = {};
    }

    playSFX(key) {
        if (!this.enabled) return;

        // Use Audio object if possible
        const path = SOUND_PATHS[key];
        if (path) {
            const audio = new Audio(path);
            audio.volume = this.sfxVolume;
            audio.play().catch(() => {
                // Silently fail if file not found, we still have procedural fallbacks
                this.playFallback(key);
            });
        } else {
            this.playFallback(key);
        }
    }

    playMusic(key, loop = true) {
        if (!this.enabled) return;
        if (this.currentMusic) {
            this.currentMusic.pause();
        }

        const path = SOUND_PATHS[key];
        if (path) {
            this.currentMusic = new Audio(path);
            this.currentMusic.volume = this.musicVolume;
            this.currentMusic.loop = loop;
            this.currentMusic.play().catch(() => console.log("Music play blocked by browser or missing file"));
        }
    }

    setMusicVolume(vol) {
        this.musicVolume = vol;
        if (this.currentMusic) this.currentMusic.volume = vol;
    }

    toggleMute() {
        this.enabled = !this.enabled;
        if (!this.enabled && this.currentMusic) {
            this.currentMusic.pause();
        } else if (this.enabled && this.currentMusic) {
            this.currentMusic.play();
        }
        return this.enabled;
    }

    // Procedural Fallbacks (Old Engine)
    playFallback(key) {
        initAudio();
        if (!audioCtx) return;

        switch (key) {
            case 'CHIP_BET': {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
                gain.gain.setValueAtTime(this.sfxVolume * 0.3, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.1);
                break;
            }
            case 'CARD_DEAL': {
                const bufferSize = audioCtx.sampleRate * 0.1;
                const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                const noise = audioCtx.createBufferSource();
                noise.buffer = buffer;
                const filter = audioCtx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 1000;
                const g = audioCtx.createGain();
                g.gain.setValueAtTime(this.sfxVolume * 0.5, audioCtx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                noise.connect(filter);
                filter.connect(g);
                g.connect(audioCtx.destination);
                noise.start();
                break;
            }
            default: {
                // Generic tick for UI
                const uiosc = audioCtx.createOscillator();
                const uigain = audioCtx.createGain();
                uiosc.type = 'sine';
                uiosc.frequency.setValueAtTime(800, audioCtx.currentTime);
                uigain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                uigain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
                uiosc.connect(uigain);
                uigain.connect(audioCtx.destination);
                uiosc.start();
                uiosc.stop(audioCtx.currentTime + 0.05);
                break;
            }
        }
    }
}

const manager = new SoundManager();

export const playFoldSound = () => manager.playSFX('FOLD');
export const playChipSound = () => manager.playSFX('CHIP_BET');
export const playCardDealSound = () => manager.playSFX('CARD_DEAL');
export const playWinSound = () => manager.playSFX('WIN');
export const playEpicWinSound = () => manager.playSFX('EPIC_WIN');
export const playTickSound = () => manager.playSFX('CLICK');
export const playHoverSound = () => manager.playSFX('HOVER');
export const playNotificationSound = () => manager.playSFX('NOTIFICATION');

export const startAmbientMusic = () => manager.playMusic('AMBIENT_LOUNGE');
export const setMusicVolume = (v) => manager.setMusicVolume(v);
export const toggleMute = () => manager.toggleMute();

export default manager;
