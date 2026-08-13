export function playTone(freq: number, duration: number, volume = 0.1) {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.value = freq;
    
    // Smooth ramp down to avoid clicks
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    // Silent fail if AudioContext is not allowed or supported
  }
}

// Preset sounds based on the spec
export const playMessageReceive = () => playTone(880, 0.1, 0.05);
export const playMessageSend = () => playTone(660, 0.1, 0.03);
export const playNotification = () => playTone(1200, 0.15, 0.08);
export const playJoinVoice = () => playTone(440, 0.2, 0.06);
export const playLeaveVoice = () => playTone(330, 0.2, 0.06);
export const playError = () => playTone(200, 0.3, 0.08);

// Multi-tone Discord-style voice sounds
export const playMuteSelf = () => {
  playTone(680, 0.04, 0.06);
  setTimeout(() => playTone(420, 0.06, 0.06), 40);
};
export const playUnmuteSelf = () => {
  playTone(420, 0.05, 0.06);
  setTimeout(() => playTone(680, 0.07, 0.06), 50);
};
export const playDeafen = () => {
  playTone(520, 0.05, 0.05);
  setTimeout(() => playTone(280, 0.10, 0.06), 50);
};
export const playUndeafen = () => {
  playTone(280, 0.07, 0.06);
  setTimeout(() => playTone(520, 0.06, 0.05), 70);
};
