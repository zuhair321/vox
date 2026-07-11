import React from 'react';

// A tiny sound-effect manager. Preloads short (<300ms) audio clips and plays
// them on demand. All sounds are purely cosmetic — they degrade silently if
// the Audio API is unavailable or if the user has muted their tab.

type SoundId = 'message' | 'join' | 'leave' | 'ping' | 'send';

// Base64-encoded short synth-blip sounds (inline, zero network requests).
// These are placeholder synth tones generated via Web Audio API on first play
// if no .mp3 asset is available.
const SOUNDS: Record<SoundId, () => void> = {} as any;

// Singleton manager — created once on first access.
let _manager: SoundManager | null = null;
function manager(): SoundManager {
  if (!_manager) _manager = new SoundManager();
  return _manager;
}

class SoundManager {
  private enabled: boolean = false;
  private ctx: AudioContext | null = null;
  private _initialized = false;

  isEnabled() { return this.enabled; }

  setEnabled(v: boolean) {
    this.enabled = v;
    try { localStorage.setItem('vox_sounds', String(v)); } catch {}
  }

  init() {
    if (this._initialized) return;
    this._initialized = true;
    try {
      this.enabled = localStorage.getItem('vox_sounds') !== 'false'; // default on
    } catch { this.enabled = false; }
  }

  private getCtx(): AudioContext | null {
    if (!this.ctx) {
      try { this.ctx = new AudioContext(); } catch { return null; }
    }
    return this.ctx;
  }

  play(id: SoundId) {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;

    // Resume suspended context (browser policy — requires user gesture).
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    gain.connect(ctx.destination);

    switch (id) {
      case 'message': {
        // Soft mid-pitch blip.
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        osc.connect(gain);
        osc.start(now); osc.stop(now + 0.25);
        break;
      }
      case 'join': {
        // Rising two-tone chime.
        [660, 880].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'triangle';
          o.frequency.value = freq;
          g.gain.setValueAtTime(0, now + i * 0.07);
          g.gain.linearRampToValueAtTime(0.06, now + i * 0.07 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.18);
          o.connect(g); g.connect(ctx.destination);
          o.start(now + i * 0.07); o.stop(now + i * 0.07 + 0.2);
        });
        break;
      }
      case 'leave': {
        // Falling two-tone.
        [880, 660].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'triangle';
          o.frequency.value = freq;
          g.gain.setValueAtTime(0, now + i * 0.07);
          g.gain.linearRampToValueAtTime(0.05, now + i * 0.07 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.18);
          o.connect(g); g.connect(ctx.destination);
          o.start(now + i * 0.07); o.stop(now + i * 0.07 + 0.2);
        });
        break;
      }
      case 'ping': {
        // Bright ping.
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(1200, now);
        o.frequency.exponentialRampToValueAtTime(800, now + 0.12);
        o.connect(gain);
        o.start(now); o.stop(now + 0.15);
        break;
      }
      case 'send': {
        // Very soft click.
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(600, now);
        o.frequency.exponentialRampToValueAtTime(300, now + 0.05);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        o.connect(gain);
        o.start(now); o.stop(now + 0.08);
        break;
      }
    }
  }
}

// Initialize from localStorage at module load.
manager().init();

export const soundManager = manager();

export function playSound(id: SoundId) {
  manager().play(id);
}

/**
 * React hook — returns { soundEnabled, toggleSound }.
 * Call once at the app root or in Settings to initialize the manager.
 */
export function useSoundSettings() {
  return {
    soundEnabled: manager().isEnabled(),
    toggleSound: () => manager().setEnabled(!manager().isEnabled()),
  };
}
