import { useCallback, useEffect, useRef, useState } from 'react';

export interface VoiceRecording {
  blob: Blob;
  url: string;
  mime: string;
  duration: number;
}

// Picks the best audio MIME supported by MediaRecorder in this browser.
function pickMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  if (typeof MediaRecorder === 'undefined') return '';
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

// A self-contained voice-note recorder built on MediaRecorder.
// Returns recording state, elapsed seconds, start/stop controls, and the
// resulting recording. Stops automatically on a 5-minute safety cap.
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopResolveRef = useRef<((rec: VoiceRecording | null) => void) | null>(null);
  const mimeRef = useRef<string>('');

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
  }, []);

  const stop = useCallback((): Promise<VoiceRecording | null> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') {
        cleanup();
        setRecording(false);
        resolve(null);
        return;
      }
      stopResolveRef.current = resolve;
      rec.stop();
    });
  }, [cleanup]);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone not available in this environment.');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      mimeRef.current = mime;
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const duration = (Date.now() - startedAtRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: mimeRef.current || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        cleanup();
        setRecording(false);
        const resolve = stopResolveRef.current;
        stopResolveRef.current = null;
        if (resolve) {
          resolve({ blob, url, mime: mimeRef.current || 'audio/webm', duration });
        }
      };
      rec.onerror = () => {
        cleanup();
        setRecording(false);
        setError('Recording failed.');
        const resolve = stopResolveRef.current;
        stopResolveRef.current = null;
        if (resolve) resolve(null);
      };

      startedAtRef.current = Date.now();
      rec.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((Date.now() - startedAtRef.current) / 1000);
      }, 200);
      return true;
    } catch (e: any) {
      cleanup();
      setRecording(false);
      if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
        setError('Microphone permission denied.');
      } else if (e?.name === 'NotFoundError') {
        setError('No microphone found.');
      } else {
        setError('Could not start recording.');
      }
      return false;
    }
  }, [cleanup]);

  const cancel = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      stopResolveRef.current = null;
      rec.stop();
    } else {
      cleanup();
      setRecording(false);
    }
  }, [cleanup]);

  useEffect(() => cleanup, [cleanup]);

  return { recording, elapsed, error, start, stop, cancel };
}
