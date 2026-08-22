import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Camera, CameraOff, Phone, X, AlertTriangle, RefreshCw, Mic2 } from 'lucide-react';
import { classifyMediaError, queryMicrophonePermission, type MediaErrorInfo } from '../../utils/mediaErrors';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';
import { applyNoiseSuppression } from '../../utils/noiseSuppression';
import { setupVoiceActivityDetection } from '../../utils/voiceActivityDetection';

interface VoicePreviewModalProps {
  open: boolean;
  channelName: string;
  onClose: () => void;
  onJoin: (opts: { muted: boolean; cameraOn: boolean }) => void;
}

interface Device {
  deviceId: string;
  label: string;
}

export const VoicePreviewModal: React.FC<VoicePreviewModalProps> = ({
  open,
  channelName,
  onClose,
  onJoin,
}) => {
  const settings = useSettingsStore();
  const addToast = useUiStore((s) => s.addToast);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const cleanupNoiseRef = useRef<(() => void) | null>(null);
  const cleanupActivityRef = useRef<(() => void) | null>(null);

  const [audioIn, setAudioIn] = useState<Device[]>([]);
  const [videoIn, setVideoIn] = useState<Device[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>(settings.inputDevice && settings.inputDevice !== 'default' ? settings.inputDevice : '');
  const [selectedCam, setSelectedCam] = useState<string>(settings.videoDevice && settings.videoDevice !== 'default' ? settings.videoDevice : '');
  const [cameraOn, setCameraOn] = useState<boolean>(true);
  const [noiseSuppression, setNoiseSuppression] = useState<number>(settings.voiceNoiseLevel ?? 0);
  const [inputLevel, setInputLevel] = useState<number>(0);
  const [ready, setReady] = useState<boolean>(false);
  const [mediaError, setMediaError] = useState<MediaErrorInfo | null>(null);
  const [permState, setPermState] = useState<'granted' | 'denied' | 'prompt' | null>(null);

  // Best-effort permission query — runs when the modal opens.
  useEffect(() => {
    if (!open) return;
    void queryMicrophonePermission().then(setPermState);
  }, [open]);

  const refreshDevices = useCallback(async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      setAudioIn(devs.filter((d) => d.kind === 'audioinput').map((d) => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 4)}` })));
      setVideoIn(devs.filter((d) => d.kind === 'videoinput').map((d) => ({ deviceId: d.deviceId, label: d.label || `Cam ${d.deviceId.slice(0, 4)}` })));
    } catch {
      // No devices available
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const acquire = async () => {
      cleanupNoiseRef.current?.();
      cleanupActivityRef.current?.();
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());

      try {
        const audioConstraints: MediaTrackConstraints = selectedMic
          ? { deviceId: { exact: selectedMic }, echoCancellation: true, noiseSuppression: false, autoGainControl: true }
          : { echoCancellation: true, noiseSuppression: false, autoGainControl: true };
        const videoConstraints: MediaTrackConstraints | boolean = cameraOn
          ? (selectedCam ? { deviceId: { exact: selectedCam } } : true)
          : false;

        const raw = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: videoConstraints as MediaTrackConstraints | boolean,
        });
        if (cancelled) { raw.getTracks().forEach((t) => t.stop()); return; }

        const audioOnly = new MediaStream(raw.getAudioTracks());
        const videoOnly = cameraOn ? new MediaStream(raw.getVideoTracks()) : null;

        let processedAudio: MediaStream = audioOnly;
        if (noiseSuppression > 0) {
          const ns = applyNoiseSuppression(audioOnly, noiseSuppression);
          cleanupNoiseRef.current = ns.cleanup;
          processedAudio = ns.stream;
        }

        const finalStream = new MediaStream();
        processedAudio.getAudioTracks().forEach((t) => finalStream.addTrack(t));
        videoOnly?.getVideoTracks().forEach((t) => finalStream.addTrack(t));

        previewStreamRef.current = finalStream;

        const cleanup = setupVoiceActivityDetection(
          finalStream,
          () => {},
          () => {},
          (amp) => setInputLevel(amp),
        );
        cleanupActivityRef.current = cleanup;

        if (videoRef.current && videoOnly) {
          videoRef.current.srcObject = videoOnly;
        } else if (videoRef.current) {
          videoRef.current.srcObject = null;
        }

        if (cancelled) return;
        setReady(true);
        setMediaError(null);
        refreshDevices();
      } catch (err) {
        if (cancelled) { return; }
        setReady(false);
        // If only video was rejected, auto-detach camera and try mic-only next time
        const info = classifyMediaError(err);
        if (info.kind === 'no_device' && cameraOn) {
          setCameraOn(false);
          setMediaError(null);
          return;
        }
        setMediaError(info);
        void queryMicrophonePermission().then(setPermState);
      }
    };

    void acquire();

    return () => {
      cancelled = true;
      cleanupNoiseRef.current?.();
      cleanupActivityRef.current?.();
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
      setReady(false);
      setInputLevel(0);
      // Note: don't clear mediaError here — keep it visible so user sees last failure on reopen
    };
  }, [open, selectedMic, selectedCam, cameraOn, noiseSuppression, refreshDevices]);

  // Manual retry: bump cameraOn state to re-trigger the acquire effect without changing anything else
  const handleRetry = useCallback(() => {
    setMediaError(null);
    // Force a re-acquire by flipping cameraOn momentarily (only if currently true)
    if (cameraOn && (mediaError?.kind === 'no_device' || mediaError?.kind === 'overconstrained')) {
      setCameraOn(false);
      requestAnimationFrame(() => setCameraOn(true));
    } else {
      // Easiest: toggle noiseSuppression momentarily — it's a useEffect dep.
      const old = noiseSuppression;
      setNoiseSuppression(0);
      requestAnimationFrame(() => setNoiseSuppression(old));
    }
  }, [cameraOn, noiseSuppression, mediaError]);

  const handleJoin = () => {
    cleanupNoiseRef.current?.();
    cleanupActivityRef.current?.();
    previewStreamRef.current?.getTracks().forEach((t) => t.stop());
    previewStreamRef.current = null;
    onJoin({ muted: false, cameraOn });
  };

  const handleNoiseChange = (v: number) => {
    setNoiseSuppression(v);
    settings.setVoiceNoiseLevel?.(v);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(8, 6, 9, 0.78)',
            backdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.94, y: 14 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 14 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            style={{
              background: 'var(--dark-matter, #161217)',
              border: '1px solid var(--rim, rgba(255,255,255,0.08))',
              borderRadius: 14,
              width: 'min(720px, 100%)',
              maxHeight: '92vh',
              overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              display: 'flex', flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--rim)' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--ash, #9aa0aa)', letterSpacing: '0.1em', fontWeight: 700 }}>VOICE PREVIEW</div>
                <div style={{ fontSize: 16, color: 'var(--ghost-white, #f5f5f7)', fontWeight: 700, marginTop: 2 }}>{channelName}</div>
              </div>
              <button
                type="button" onClick={onClose}
                aria-label="Close"
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--rim)',
                  background: 'transparent', color: 'var(--ash)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <X size={16} />
              </button>
            </div>

            
            {mediaError && (
              <div
                role="alert"
                aria-live="polite"
                style={{
                  margin: '0 18px 14px',
                  padding: 16,
                  background: mediaError.kind === 'permission_denied' ? 'rgba(216,74,90,0.08)' : 'rgba(217,201,141,0.06)',
                  border: `1px solid ${mediaError.kind === 'permission_denied' ? 'rgba(216,74,90,0.4)' : 'rgba(217,201,141,0.3)'}`,
                  borderRadius: 10,
                  display: 'flex', gap: 14,
                  alignItems: mediaError.steps.length > 0 ? 'flex-start' : 'center',
                }}
              >
                <div style={{
                  flexShrink: 0,
                  width: 40, height: 40, borderRadius: '50%',
                  background: mediaError.kind === 'permission_denied' ? 'rgba(216,74,90,0.18)' : 'rgba(217,201,141,0.15)',
                  display: 'grid', placeItems: 'center',
                  color: mediaError.kind === 'permission_denied' ? '#ffaab0' : '#d9c98d',
                }}>
                  <AlertTriangle size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em' }}>
                    {mediaError.title.toUpperCase()}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 14, color: 'var(--ghost-white)', fontWeight: 600 }}>
                    {mediaError.short}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ash)', lineHeight: 1.55 }}>
                    {mediaError.detail}
                  </div>
                  {mediaError.steps.length > 0 && (
                    <ol style={{ marginTop: 10, paddingLeft: 18, fontSize: 12, color: 'var(--ash)', lineHeight: 1.6 }}>
                      {mediaError.steps.map((s, i) => (
                        <li key={i} style={{ marginBottom: 2 }}>{s}</li>
                      ))}
                    </ol>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {mediaError.recoverable && (
                      <button
                        type="button"
                        onClick={handleRetry}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '7px 14px',
                          fontSize: 12, fontWeight: 700,
                          background: 'rgba(74,194,82,0.15)',
                          border: '1px solid rgba(74,194,82,0.4)',
                          borderRadius: 6,
                          color: 'var(--toxic)',
                          cursor: 'pointer',
                          transition: 'transform 0.12s ease, background 0.12s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(74,194,82,0.25)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(74,194,82,0.15)')}
                      >
                        <RefreshCw size={12} /> TRY AGAIN
                      </button>
                    )}
                    {permState === 'denied' && (
                      <button
                        type="button"
                        onClick={() => {
                          // Chromium surfaces a small "reset permissions" affordance when the user clicks this.
                          // Browsers that don't support it will just sit on "denied".
                          try {
                            // @ts-ignore — non-standard but widely supported in Chromium for Electron
                            navigator.permissions.revoke?.({ name: 'microphone' });
                          } catch {}
                          addToast('Open your system privacy settings and re-enable microphone permission for VOX.', 'info');
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '7px 14px',
                          fontSize: 12, fontWeight: 700,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--rim)',
                          borderRadius: 6,
                          color: 'var(--ghost-white)',
                          cursor: 'pointer',
                        }}
                      >
                        <Mic2 size={12} /> RESET PERMISSION
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Preview area */}
            <div style={{ position: 'relative', background: 'var(--void)', aspectRatio: mediaError ? 'auto' : '16/9', overflow: 'hidden', minHeight: mediaError ? 60 : undefined }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  display: cameraOn ? 'block' : 'none',
                }}
              />
              {!cameraOn && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'radial-gradient(circle at center, var(--dark-matter) 0%, var(--void) 100%)',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: 96, height: 96, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--void-purple, #6a4ec2) 0%, var(--obsidian, #1a131c) 100%)',
                      border: '2px solid var(--rim)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 38, fontWeight: 800, color: 'var(--ghost-white)',
                      margin: '0 auto',
                    }}>
                      <CameraOff size={36} />
                    </div>
                    <div style={{ marginTop: 14, color: 'var(--ash)', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em' }}>Camera off</div>
                  </div>
                </div>
              )}

              {/* Live mic level meter */}
              <div style={{
                position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 3, alignItems: 'flex-end', height: 20,
              }}>
                {Array.from({ length: 24 }).map((_, i) => {
                  const active = i / 24 < inputLevel;
                  return (
                    <div key={i} style={{
                      width: 4, borderRadius: 1,
                      height: 4 + (i / 2),
                      background: active ? (inputLevel > 0.85 ? 'var(--blood, #d84a5a)' : 'var(--toxic, #4ac252)') : 'rgba(255,255,255,0.18)',
                      transition: 'background 60ms linear, height 60ms linear',
                    }} />
                  );
                })}
              </div>
            </div>

            {/* Controls panel */}
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  type="button" onClick={() => setCameraOn((v) => !v)}
                  aria-label={cameraOn ? 'Stop camera' : 'Start camera'}
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    border: 'none',
                    background: cameraOn ? 'var(--discord-blurple, #5865f2)' : 'rgba(255,255,255,0.06)',
                    color: cameraOn ? '#fff' : 'var(--ash)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform 0.15s ease, background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {cameraOn ? <Camera size={22} /> : <CameraOff size={22} />}
                </button>

                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  border: 'none',
                  background: inputLevel > 0.01 ? 'var(--toxic, #4ac252)' : 'rgba(255,255,255,0.06)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 80ms linear',
                }}>
                  {inputLevel > 0.01 ? <Mic size={22} /> : <MicOff size={22} />}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ fontSize: 10, color: 'var(--ash)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>MICROPHONE</label>
                  <select
                    value={selectedMic}
                    onChange={(e) => { setSelectedMic(e.target.value); settings.setInputDevice?.(e.target.value || 'default'); }}
                    style={{
                      width: '100%', padding: '8px 10px', fontSize: 13,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--rim)',
                      borderRadius: 6, color: 'var(--ghost-white)',
                    }}
                  >
                    <option value=''>System default</option>
                    {audioIn.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ fontSize: 10, color: 'var(--ash)', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>CAMERA</label>
                  <select
                    value={selectedCam}
                    onChange={(e) => { setSelectedCam(e.target.value); settings.setVideoDevice?.(e.target.value || 'default'); }}
                    disabled={!cameraOn}
                    style={{
                      width: '100%', padding: '8px 10px', fontSize: 13,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--rim)',
                      borderRadius: 6, color: 'var(--ghost-white)', opacity: cameraOn ? 1 : 0.4,
                    }}
                  >
                    <option value=''>System default</option>
                    {videoIn.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, color: 'var(--ash)', fontWeight: 700, letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>NOISE SUPPRESSION</span>
                  <span style={{ color: 'var(--ghost-white)' }}>{Math.round(noiseSuppression * 100)}%</span>
                </label>
                <input
                  type='range' min={0} max={1} step={0.05}
                  value={noiseSuppression}
                  onChange={(e) => handleNoiseChange(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--discord-blurple)' }}
                />
              </div>
            </div>

            {/* Footer actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '12px 18px', borderTop: '1px solid var(--rim)' }}>
              <button
                type="button" onClick={onClose}
                style={{
                  padding: '10px 18px', fontSize: 13, fontWeight: 600,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--rim)',
                  borderRadius: 6, color: 'var(--ghost-white)', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              >
                Cancel
              </button>
              <button
                type="button" onClick={() => handleJoin()}
                disabled={!ready || (mediaError != null && !mediaError.recoverable)}
                style={{
                  padding: '10px 22px', fontSize: 13, fontWeight: 700,
                  background: ready ? 'var(--toxic, #4ac252)' : 'rgba(255,255,255,0.06)',
                  border: 'none', borderRadius: 6,
                  color: ready ? '#0e1411' : 'var(--ash)',
                  cursor: ready ? 'pointer' : 'not-allowed',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  transition: 'transform 0.15s ease, filter 0.15s',
                }}
                onMouseEnter={(e) => { if (ready) e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <Phone size={14} />
                JOIN VOICE
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoicePreviewModal;
