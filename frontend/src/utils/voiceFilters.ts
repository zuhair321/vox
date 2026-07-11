// Voice filters — real-time audio effects via Web Audio API
// Each filter creates a different processing chain on the mic stream

export type VoiceFilter = 'none' | 'robot' | 'deep' | 'underwater' | 'whisper';

interface FilterConfig {
  label: string;
  icon: string;
  description: string;
}

export const VOICE_FILTERS: Record<VoiceFilter, FilterConfig> = {
  none: { label: 'None', icon: '🎤', description: 'No filter applied' },
  robot: { label: 'Robot', icon: '🤖', description: 'Metallic voice modulation' },
  deep: { label: 'Deep', icon: '👹', description: 'Pitch-shifted lower' },
  underwater: { label: 'Underwater', icon: '🌊', description: 'Muffled aquatic sound' },
  whisper: { label: 'Whisper', icon: '🤫', description: 'Soft whispered voice' },
};

// Create a filtered MediaStream from the original mic stream
export function applyVoiceFilter(
  stream: MediaStream,
  filter: VoiceFilter,
  audioContext?: AudioContext,
): { stream: MediaStream; cleanup: () => void } {
  if (filter === 'none') {
    return { stream, cleanup: () => {} };
  }

  const ctx = audioContext || new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const destination = ctx.createMediaStreamDestination();

  let nodes: AudioNode[] = [];

  switch (filter) {
    case 'robot': {
      // Ring modulation + distortion for metallic effect
      const oscillator = ctx.createOscillator();
      oscillator.frequency.value = 50; // Low frequency carrier
      oscillator.type = 'sawtooth';

      const ringGain = ctx.createGain();
      ringGain.gain.value = 0;
      oscillator.connect(ringGain.gain);
      oscillator.start();

      const waveshaper = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i / 128) - 1;
        curve[i] = (Math.PI + 100) * x / (Math.PI + 100 * Math.abs(x));
      }
      waveshaper.curve = curve;

      source.connect(ringGain);
      ringGain.connect(waveshaper);
      waveshaper.connect(destination);
      nodes = [oscillator, ringGain, waveshaper];
      break;
    }

    case 'deep': {
      // Pitch shift down using playback rate trick
      const biquad = ctx.createBiquadFilter();
      biquad.type = 'lowshelf';
      biquad.frequency.value = 200;
      biquad.gain.value = 15;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.ratio.value = 8;

      source.connect(biquad);
      biquad.connect(compressor);
      compressor.connect(destination);
      nodes = [biquad, compressor];
      break;
    }

    case 'underwater': {
      // Low-pass filter + reverb-like delay
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 800;
      lowpass.Q.value = 2;

      const delay = ctx.createDelay();
      delay.delayTime.value = 0.08;

      const feedback = ctx.createGain();
      feedback.gain.value = 0.4;

      const wetGain = ctx.createGain();
      wetGain.gain.value = 0.6;

      source.connect(lowpass);
      lowpass.connect(destination);
      lowpass.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wetGain);
      wetGain.connect(destination);
      nodes = [lowpass, delay, feedback, wetGain];
      break;
    }

    case 'whisper': {
      // Heavy compression + high-pass to simulate whisper
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 300;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -40;
      compressor.knee.value = 20;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      const gain = ctx.createGain();
      gain.gain.value = 2.5;

      source.connect(highpass);
      highpass.connect(compressor);
      compressor.connect(gain);
      gain.connect(destination);
      nodes = [highpass, compressor, gain];
      break;
    }
  }

  const cleanup = () => {
    nodes.forEach(n => {
      try { n.disconnect(); } catch {}
    });
    source.disconnect();
    if (!audioContext) ctx.close();
  };

  return { stream: destination.stream, cleanup };
}
