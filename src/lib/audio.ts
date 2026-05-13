export const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
let isMuted = false;

export const toggleMute = () => { isMuted = !isMuted; return isMuted; };
export const getMute = () => isMuted;
export const setMute = (mute: boolean) => { isMuted = mute; };

const playTone = (freq: number, type: OscillatorType, duration: number, vol: number = 0.1, slideFreq?: number) => {
    if (isMuted) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
};

export const playShoot = () => playTone(400, 'square', 0.1, 0.05, 100);
export const playLaser = () => playTone(600, 'sawtooth', 0.15, 0.03, 800);
export const playMissile = () => playTone(150, 'sine', 0.3, 0.08, 50);
export const playExplosion = () => playTone(100, 'square', 0.3, 0.1, 20);
export const playHit = () => playTone(800, 'square', 0.05, 0.05);
export const playLevelUp = () => {
    playTone(400, 'sine', 0.1, 0.1);
    setTimeout(() => playTone(600, 'sine', 0.2, 0.1), 100);
    setTimeout(() => playTone(800, 'sine', 0.4, 0.1), 200);
};
export const playPowerup = () => {
    playTone(600, 'square', 0.1, 0.05);
    setTimeout(() => playTone(900, 'square', 0.2, 0.05), 100);
};
export const playDash = () => playTone(200, 'sawtooth', 0.2, 0.05);
export const playError = () => playTone(150, 'sawtooth', 0.2, 0.1);
export const playBuy = () => playTone(800, 'sine', 0.1, 0.05, 1200);
