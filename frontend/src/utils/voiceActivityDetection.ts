export type VoiceActivityCleanup = () => void;
export type AmplitudeCallback = (amplitude: number) => void;

export function setupVoiceActivityDetection(
  stream: MediaStream,
  onSpeaking: () => void,
  onSilent: () => void,
  onAmplitude?: AmplitudeCallback,
): VoiceActivityCleanup {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return () => undefined;

  const audioContext = new AudioContextClass();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.4;
  source.connect(analyser);

  const data = new Uint8Array(analyser.frequencyBinCount);
  let speaking = false;
  let silenceTimer: number | undefined;
  let frame = 0;
  let stopped = false;

  const check = () => {
    if (stopped) return;
    analyser.getByteFrequencyData(data);
    const average = data.reduce((sum, value) => sum + value, 0) / data.length;
    // Normalize amplitude to 0-1 range (typical voice range is 0-255, but we'll normalize to 0-1 for UI)
    const amplitude = Math.min(average / 255, 1.0);

    if (average > 15) {
      if (!speaking) {
        speaking = true;
        onSpeaking();
      }
      if (silenceTimer) window.clearTimeout(silenceTimer);
      silenceTimer = window.setTimeout(() => {
        speaking = false;
        onSilent();
      }, 300);
    } else {
      if (speaking) {
        speaking = false;
        onSilent();
      }
    }

    // Call amplitude callback if provided
    if (onAmplitude) {
      onAmplitude(amplitude);
    }

    frame = window.requestAnimationFrame(check);
  };

  check();

  return () => {
    stopped = true;
    window.cancelAnimationFrame(frame);
    if (silenceTimer) window.clearTimeout(silenceTimer);
    source.disconnect();
    audioContext.close().catch(() => undefined);
  };
}
