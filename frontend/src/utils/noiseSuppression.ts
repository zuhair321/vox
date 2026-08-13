// Spectral noise-suppression utility. Routes a mic MediaStream through a
// Web Audio pipeline: high-pass → low-pass → noise gate (compressor)
// → soft makeup gain. The `intensity` parameter (0-1) controls aggressiveness.

export interface NoiseSuppressedHandle {
  stream: MediaStream;     // output stream (use this in RTCPeerConnection)
  cleanup: () => void;
  /** Recompute intensity on the fly (e.g. live slider in settings). */
  setIntensity: (v: number) => void;
}

export function applyNoiseSuppression(
  input: MediaStream,
  intensity = 0.7,
  externalCtx?: AudioContext,
): NoiseSuppressedHandle {
  const ownCtx = !externalCtx;
  const ctx = externalCtx ?? new AudioContext();
  const source = ctx.createMediaStreamSource(input);

  // ── Stage 1: high-pass — cuts low-frequency rumble / HVAC ──────────────
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 80 + intensity * 80; // 80–160 Hz
  hp.Q.value = 0.7;

  // ── Stage 2: low-pass — cuts hiss / fan whine ─────────────────────────
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 12000 - intensity * 4000; // 12k–8k
  lp.Q.value = 0.7;

  // ── Stage 3: dynamics compressor acting as a noise gate ───────────────
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -55 + intensity * 25;     // -55dB → -30dB
  comp.knee.value = 6;
  comp.ratio.value = 2 + intensity * 6;             // 2:1 → 8:1
  comp.attack.value = 0.003;
  comp.release.value = 0.18;

  // ── Stage 4: soft makeup gain so the user's voice still feels alive ───
  const makeup = ctx.createGain();
  makeup.gain.value = 1.0 + intensity * 0.15;

  // ── Stage 5: optional notch at 50/60Hz hum ───────────────────────────
  const notch = ctx.createBiquadFilter();
  notch.type = 'notch';
  notch.frequency.value = 60;
  notch.Q.value = 8;

  source.connect(hp);
  hp.connect(lp);
  lp.connect(notch);
  notch.connect(comp);
  comp.connect(makeup);

  const dest = ctx.createMediaStreamDestination();
  makeup.connect(dest);

  const setIntensity = (v: number) => {
    v = Math.max(0, Math.min(1, v));
    hp.frequency.value = 80 + v * 80;
    lp.frequency.value = 12000 - v * 4000;
    comp.threshold.value = -55 + v * 25;
    comp.ratio.value = 2 + v * 6;
    makeup.gain.value = 1.0 + v * 0.15;
  };

  const cleanup = () => {
    try { source.disconnect(); } catch {}
    try { hp.disconnect(); } catch {}
    try { lp.disconnect(); } catch {}
    try { notch.disconnect(); } catch {}
    try { comp.disconnect(); } catch {}
    try { makeup.disconnect(); } catch {}
    if (ownCtx) ctx.close().catch(() => undefined);
  };

  return { stream: dest.stream, cleanup, setIntensity };
}
