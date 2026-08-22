import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useVoiceStore } from '../../stores/voiceStore';
import { useSocketStore } from '../../stores/socketStore';
import { useServerStore } from '../../stores/serverStore';
import VoiceTimer from '../voice/VoiceTimer';
import VoiceVideoGrid from '../voice/VoiceVideoGrid';
import AudioVisualizer from '../ui/AudioVisualizer';
import StatusDot from '../void/StatusDot';
import AvatarRing from '../ui/AvatarRing';
import SpatialVoiceCanvas from './SpatialVoiceCanvas';
import { VoiceFilter, VOICE_FILTERS, applyVoiceFilter } from '../../utils/voiceFilters';
import {
  getMicrophoneStream,
  getDisplayStream,
  createPeerConnection,
  addLocalTracksToPeer,
  createOffer,
  createAnswer,
  setRemoteDescription,
  addIceCandidate,
  ScreenQuality,
} from '../../utils/webrtc';
import { setupVoiceActivityDetection } from '../../utils/voiceActivityDetection';
import { Mic, MicOff, Headphones, PhoneOff, Volume2, VolumeX, Camera, Monitor, Settings, Maximize2, Minimize2, Hand, Music } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { applyNoiseSuppression } from '../../utils/noiseSuppression';
import { startPushToTalk, stopPushToTalk } from '../../utils/pushToTalk';
import { trackPeer, type PeerQuality } from '../../utils/connectionQuality';
import { playJoinVoice, playLeaveVoice, playMuteSelf, playUnmuteSelf, playDeafen, playUndeafen } from '../../utils/sounds';
import { classifyMediaError, type MediaErrorInfo } from '../../utils/mediaErrors';
import MediaPermissionPanel, { type MediaKind } from './MediaPermissionPanel';
import VoicePreviewModal from './VoicePreviewModal';
import QualityBars from './QualityBars';
import { useUiStore } from '../../stores/uiStore';
import { connectSfu, applySfuMute, type SfuConnection } from '../../utils/livekitVoice';
import { API_BASE } from '../../api/client';
import NowPlayingBar from './NowPlayingBar';

const VoiceChannelPanel: React.FC = () => {
  const voice = useVoiceStore();
  const socket = useSocketStore();
  const { selectedServer, selectedChannel } = useServerStore();
  const { addToast } = useUiStore();
  const voiceActivityCleanupRef = useRef<(() => void) | null>(null);
  const sfuConnRef = useRef<SfuConnection | null>(null);
  const [sfuServerReady, setSfuServerReady] = useState<boolean | null>(null);
  const [screenQuality, setScreenQuality] = useState<ScreenQuality>(
    () => (localStorage.getItem('vox_screen_quality') as ScreenQuality) || 'balanced'
  );
  const [musicBarOpen, setMusicBarOpen] = useState(false);
  const [captureAudio, setCaptureAudio] = useState<boolean>(
    () => localStorage.getItem('vox_screen_audio') !== 'false'
  );
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [voiceFilter, setVoiceFilter] = useState<VoiceFilter>(
    () => (localStorage.getItem('vox_voice_filter') as VoiceFilter) || 'none'
  );
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const settings = useSettingsStore();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingPreview, setPendingPreview] = useState<{ channelId: string; serverId: string; channelName: string; rtcMode: string } | null>(null);
  const [peerQualityMap, setPeerQualityMap] = useState<Map<string, PeerQuality>>(new Map());
  const [pttActive, setPttActive] = useState(false);
  const [poppedOut, setPoppedOut] = useState(false);
  const [videoError, setVideoError] = useState<MediaErrorInfo | null>(null);
  const [videoErrorOpen, setVideoErrorOpen] = useState(false);
  const [micError, setMicError] = useState<MediaErrorInfo | null>(null);
  const [micErrorOpen, setMicErrorOpen] = useState(false);
  // Helper: route a classified MediaErrorInfo to the right inline panel.
  const showMediaError = (kind: MediaKind, info: MediaErrorInfo) => {
    if (kind === 'microphone') {
      setMicError(info);
      setMicErrorOpen(true);
    } else {
      setVideoError(info);
      setVideoErrorOpen(true);
    }
  };
  const noiseSuppressionCleanupRef = useRef<(() => void) | null>(null);

  // Show preview modal first; user confirms → joinChannel runs.
  // The optional `rtcMode` parameter lets the modal/popover label the join as
  // SFU-backed (large stages, LiveKit-powered) versus the default mesh path.
  const requestJoinChannel = useCallback((channelId: string, serverId: string, channelName: string, rtcMode: string = 'MESH') => {
    if (voice.connected || voice.joinInProgress) return;
    setPendingPreview({ channelId, serverId, channelName, rtcMode });
    setPreviewOpen(true);
  }, [voice.connected, voice.joinInProgress]);

  // Join voice channel — preview-aware with noise suppression pipeline.
  // Branches on rtcMode: 'SFU' routes through LiveKit (scales beyond 6 peers
  // and exists server-side for presence); 'MESH' (default) keeps the existing
  // full-mesh WebRTC fan-out.
  const joinChannel = useCallback(async (channelId: string, serverId: string, rtcMode: string = 'MESH') => {
    if (voice.connected || voice.joinInProgress) return;
    try {
      voice.setJoinInProgress(true);
      // Detect on first join whether the backend has LiveKit configured — we
      // hit the cheap /api/voice/config endpoint so we know whether SFU is
      // even possible before attempting it.
      if (sfuServerReady === null) {
        try {
          const res = await fetch(`${API_BASE}/api/voice/config`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });
          const data = await res.json().catch(() => ({}));
          setSfuServerReady(Boolean(data?.sfuEnabled));
        } catch {
          setSfuServerReady(false);
        }
      }

      const wantsSfu = rtcMode === 'SFU' && sfuServerReady === true;
      if (wantsSfu) {
        voice.setTransport('sfu');
        const conn = await connectSfu(channelId, serverId, { camera: false });
        sfuConnRef.current = conn;
        playJoinVoice();
        addToast('Connected via LiveKit SFU', 'success', { duration: 4000 });
        voice.setJoinInProgress(false);
        return;
      }

      voice.setTransport('mesh');
      // Join VC muted — mic will be requested lazily on first unmute.
      voice.setLocalMuted(true);
      voice.setChannel(channelId, serverId);
      voice.setJoinedAt(Date.now());
      setMicError(null);
      setMicErrorOpen(false);
      playJoinVoice();

      socket.socket?.emit('voice:join', { channelId, serverId });
      voice.setJoinInProgress(false);
    } catch (err: unknown) {
      const info = classifyMediaError(err);
      console.error('[Voice] Error joining channel:', err);
      addToast(info.title, info.kind === 'permission_denied' ? 'warning' : 'error');
      // Inline recovery panel stays open below the toolbar; toast is just the brief signal.
      showMediaError('microphone', info);
      voice.clearChannel();
      voice.setTransport(null);
      voice.setJoinInProgress(false);
    }
  }, [voice, socket, addToast, settings.voiceNoiseLevel, sfuServerReady]);

  // Leave voice channel — full cleanup.
  const leaveChannel = useCallback(() => {
    // SFU path: tear down the LiveKit room (which also emits voice:leave and
    // stops local tracks). The disconnect helper wraps the entire tear-down.
    if (sfuConnRef.current) {
      const conn = sfuConnRef.current;
      sfuConnRef.current = null;
      conn.disconnect().catch(() => {});
      playLeaveVoice();
      setPeerQualityMap(new Map());
      return;
    }
    if (voiceActivityCleanupRef.current) {
      voiceActivityCleanupRef.current();
      voiceActivityCleanupRef.current = null;
    }
    if (noiseSuppressionCleanupRef.current) {
      noiseSuppressionCleanupRef.current();
      noiseSuppressionCleanupRef.current = null;
    }
    // Stop all local media tracks so the OS mic indicator turns off
    if (voice.localStream) {
      voice.localStream.getTracks().forEach(t => { t.stop(); });
    }
    stopPushToTalk();
    setPttActive(false);
    socket.socket?.emit('voice:leave');
    voice.clearChannel();
    voice.setTransport(null);
    playLeaveVoice();
    setPeerQualityMap(new Map());
  }, [voice, socket]);

  // Mute toggle — disabled while push-to-talk owns mute state.
  const toggleMute = useCallback(async () => {
    if (settings.pushToTalk) return;
    const unmuting = voice.localMuted;

    // On first unmute: lazily acquire the mic stream.
    if (unmuting && !voice.localStream) {
      try {
        const raw = await getMicrophoneStream();
        let processedStream: MediaStream = raw;
        if (settings.voiceNoiseLevel && settings.voiceNoiseLevel > 0) {
          const ns = applyNoiseSuppression(raw, settings.voiceNoiseLevel);
          noiseSuppressionCleanupRef.current = ns.cleanup;
          const dst = new MediaStream();
          ns.stream.getAudioTracks().forEach(t => dst.addTrack(t));
          processedStream = dst;
        }
        voice.setLocalStream(processedStream);
        const cleanup = setupVoiceActivityDetection(
          processedStream,
          () => voice.setLocalSpeaking(true),
          () => voice.setLocalSpeaking(false),
          (amplitude) => voice.setUserAmplitude('local', amplitude)
        );
        voiceActivityCleanupRef.current = cleanup;
        // Wire stream to existing peers
        voice.peers.forEach(async (pc) => {
          processedStream.getTracks().forEach(track => pc.addTrack(track, processedStream));
          const offer = await createOffer(pc);
          const peerSocketId = Array.from(voice.peers.entries()).find(([, p]) => p === pc)?.[0];
          if (peerSocketId) socket.socket?.emit('voice:offer', { to: peerSocketId, offer });
        });
      } catch (err: unknown) {
        const info = classifyMediaError(err);
        console.error('[Voice] Mic acquisition failed:', err);
        showMediaError('microphone', info);
        return; // Keep muted
      }
    }

    const next = !voice.localMuted;
    voice.setLocalMuted(next);
    socket.socket?.emit('voice:mute', { muted: next });
    if (voice.transport === 'sfu') applySfuMute();
    if (next) playUnmuteSelf(); else playMuteSelf();
  }, [voice, socket, settings.pushToTalk, settings.voiceNoiseLevel]);

  // Deafen toggle
  const toggleDeafen = useCallback(() => {
    if (settings.pushToTalk) return;
    const next = !voice.localDeafened;
    voice.setLocalDeafened(next);
    socket.socket?.emit('voice:deafen', { deafened: next });
    // On SFU, deafen = mute both directions; apply the muted side only here
    // (the local-track reflection is handled by the mute flag, deafen still
    // mutes incoming audio via the <audio> volume element).
    if (voice.transport === 'sfu' && next) applySfuMute();
    if (next) playDeafen(); else playUndeafen();
  }, [voice, socket, settings.pushToTalk]);

  // Video toggle
  const toggleVideo = useCallback(async () => {
    if (voice.localVideo) {
      // Turn off video
      voice.localStream?.getVideoTracks().forEach(t => { t.enabled = false; t.stop(); });
      voice.setLocalVideo(false);
      socket.socket?.emit('voice:video', { video: false });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (voice.localStream) {
        // Add video track to existing audio stream
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) voice.localStream.addTrack(videoTrack);
        // Re-negotiate with all peers
        voice.peers.forEach(async (pc) => {
          if (videoTrack) pc.addTrack(videoTrack, voice.localStream!);
          const offer = await createOffer(pc);
          const peerSocketId = Array.from(voice.peers.entries()).find(([, p]) => p === pc)?.[0];
          if (peerSocketId) socket.socket?.emit('voice:offer', { to: peerSocketId, offer });
        });
      } else {
        voice.setLocalStream(stream);
      }
      voice.setLocalVideo(true);
      setVideoError(null);
      setVideoErrorOpen(false);
      socket.socket?.emit('voice:video', { video: true });
    } catch (err: unknown) {
      const info = classifyMediaError(err);
      // Always show a single toast for high-level signal; the inline panel
      // stays open until the user retries or dismisses it.
      addToast(info.title, info.kind === 'permission_denied' ? 'warning' : 'error');
      setVideoError(info);
      setVideoErrorOpen(true);
    }
  }, [voice, socket, addToast]);

  // Screen share toggle
  const toggleScreenShare = useCallback(async () => {
    if (voice.screenSharing) {
      // Stop screen share: stop tracks on the dedicated screen stream and tell peers.
      voice.localScreenStream?.getTracks().forEach(t => t.stop());
      voice.setLocalScreenStream(null);
      voice.setScreenSharing(false);
      socket.socket?.emit('voice:screen', { screen: false });
      return;
    }
    try {
      const stream = await getDisplayStream(screenQuality, captureAudio);
      const screenTrack = stream.getVideoTracks()[0];
      if (!screenTrack) {
        addToast('No screen track captured.', 'error');
        return;
      }
      voice.setLocalScreenStream(stream);
      voice.setScreenSharing(true);
      socket.socket?.emit('voice:screen', { screen: true });

      if (voice.localStream) {
        // Add the screen track to every existing peer connection. If the
        // connection already has a video sender (e.g. camera), replace its
        // track; otherwise add a fresh track so the offer carries a video
        // m-line that receivers can accept.
        voice.peers.forEach(async (pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(screenTrack);
          } else {
            pc.addTrack(screenTrack, stream);
          }
          const offer = await createOffer(pc);
          const peerSocketId = Array.from(voice.peers.entries()).find(([, p]) => p === pc)?.[0];
          if (peerSocketId) socket.socket?.emit('voice:offer', { to: peerSocketId, offer });
        });
      }

      // Handle user ending screen share via the browser's native picker UI.
      screenTrack.addEventListener('ended', () => {
        voice.localScreenStream?.getTracks().forEach(t => t.stop());
        voice.setLocalScreenStream(null);
        voice.setScreenSharing(false);
        socket.socket?.emit('voice:screen', { screen: false });
      });
    } catch (err: any) {
      // User-cancelled picker (AbortError) is expected and silent.
      if (err?.name !== 'AbortError' && err?.name !== 'NotAllowedError') {
        const info = classifyMediaError(err);
        addToast(info.kind === 'unsupported' ? 'Screen sharing is not supported in this runtime.' : (info.short || 'Could not share screen.'), 'error');
      }
    }
  }, [voice, socket, addToast, screenQuality, captureAudio]);

  // ── Push-to-Talk ────────────────────────────────────────────────────────
  // When settings.pushToTalk is on, the user is muted by default. Pressing the
  // bound key temporarily unmutes them (until released).
  useEffect(() => {
    if (!voice.connected || !settings.pushToTalk) {
      stopPushToTalk();
      setPttActive(false);
      return;
    }
    if (!voice.localMuted) {
      voice.setLocalMuted(true);
      socket.socket?.emit('voice:mute', { muted: true });
    }
    const cleanup = startPushToTalk({
      key: settings.pushToTalkKey || 'V',
      active: (active: boolean) => {
        setPttActive(active);
        voice.setLocalMuted(!active);
        socket.socket?.emit('voice:mute', { muted: !active });
        if (active) playUnmuteSelf(); else playMuteSelf();
      },
    });
    return cleanup;
  }, [voice.connected, settings.pushToTalk, settings.pushToTalkKey, voice, socket]);

  // Set up voice activity detection with amplitude tracking
  useEffect(() => {
    if (!voice.localStream || !voice.connected) return;

    let lastAmplitudeEmit = 0;
    const AMPLITUDE_THROTTLE_MS = 100; // 10Hz

    const cleanup = setupVoiceActivityDetection(
      voice.localStream,
      () => {
        voice.setLocalSpeaking(true);
        socket.socket?.emit('voice:speaking', { speaking: true });
      },
      () => {
        voice.setLocalSpeaking(false);
        socket.socket?.emit('voice:speaking', { speaking: false });
      },
      (amplitude) => {
        const now = Date.now();
        if (now - lastAmplitudeEmit >= AMPLITUDE_THROTTLE_MS) {
          lastAmplitudeEmit = now;
          socket.socket?.emit('voice:amplitude', { amplitude });
        }
      }
    );

    return cleanup;
  }, [voice.localStream, voice.connected, socket]);

  // Handle incoming WebRTC signals and voice events
  useEffect(() => {
    if (!socket.socket || !voice.connected) return;

    const handleUserJoined = ({ socketId, userId, username, avatarUrl }: { socketId: string; userId: string; username: string; avatarUrl?: string | null }) => {
      voice.addVoiceUser({ socketId, userId, username, avatarUrl, speaking: false, muted: false, deafened: false });
    };

    const handleUserLeft = (socketId: string) => {
      voice.removeVoiceUser(socketId);
      setPeerQualityMap(prev => {
        if (!prev.has(socketId)) return prev;
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    };

    const createPeerHandler = (peerSocketId: string) => {
      const pc = createPeerConnection(
        peerSocketId,
        (candidate) => { socket.socket?.emit('voice:ice-candidate', { to: peerSocketId, candidate }); },
        (_pid, stream, track) => {
          // Route screen-share video tracks to the dedicated map so the
          // ScreenShareOverlay can render them separately from webcam video.
          const user = voice.voiceUsers.find(u => u.socketId === peerSocketId);
          if (track.kind === 'video' && (user?.screenSharing || voice.remoteScreenStreams.has(peerSocketId))) {
            voice.setRemoteScreenStream(peerSocketId, stream);
          } else {
            voice.addRemoteStream(peerSocketId, stream);
          }
        }
      );
      voice.addPeer(peerSocketId, pc);
      trackPeer(peerSocketId, pc, (q) => {
        setPeerQualityMap(prev => {
          const m = new Map(prev);
          m.set(peerSocketId, q);
          return m;
        });
      });
      return pc;
    };

    const handleOffer = ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      // On the SFU path LiveKit carries the media; ignore mesh offers so we
      // don't burn CPU/ports building per-peer RTCPeerConnections that aren't
      // actually used.
      if (voice.transport === 'sfu') return;
      // Create peer connection for the offer
      const pc = createPeerHandler(from);

      // Set remote description
      setRemoteDescription(pc, offer);

      // Add local tracks to peer
      if (voice.localStream) {
        addLocalTracksToPeer(pc, voice.localStream);
      }

      // Create answer
      createAnswer(pc).then(answer => {
        setRemoteDescription(pc, answer);
        socket.socket?.emit('voice:answer', { to: from, answer });
      }).catch(err => {
        console.error('Error creating answer:', err);
      });
    };

    const handleAnswer = ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      if (voice.transport === 'sfu') return;
      const pc = voice.peers.get(from);
      if (pc) {
        setRemoteDescription(pc, answer);
      }
    };

    const handleIceCandidate = ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      if (voice.transport === 'sfu') return;
      const pc = voice.peers.get(from);
      if (pc) {
        addIceCandidate(pc, candidate);
      }
    };

    const handleUserMuted = ({ socketId, muted }: { socketId: string; muted: boolean }) => {
      voice.updateVoiceUser(socketId, { muted });
    };

    const handleUserDeafened = ({ socketId, deafened }: { socketId: string; deafened: boolean }) => {
      voice.updateVoiceUser(socketId, { deafened });
    };

    const handleUserSpeaking = ({ socketId, speaking }: { socketId: string; speaking: boolean }) => {
      voice.updateVoiceUser(socketId, { speaking });
    };

    const handleUserAmplitude = ({ socketId, amplitude }: { socketId: string; amplitude: number }) => {
      voice.setUserAmplitude(socketId, amplitude);
    };

    const handlePeerScreen = ({ socketId, screen }: { socketId: string; screen: boolean }) => {
      voice.setUserScreenSharing(socketId, screen);
      if (!screen) {
        voice.clearRemoteScreenStream(socketId);
      } else if (voice.remoteStreams.has(socketId) && !voice.remoteScreenStreams.has(socketId)) {
        // The screen stream arrived before the voice:screen flag — move it
        // to the dedicated screen map so the overlay picks it up.
        const stream = voice.remoteStreams.get(socketId)!;
        voice.setRemoteScreenStream(socketId, stream);
      }
    };

    const handleUserVideo = ({ socketId, video }: { socketId: string; video: boolean }) => {
      voice.updateVoiceUser(socketId, { screenSharing: video } as any);
    };

    const handleScreenRequest = ({ from }: { from: string }) => {
      // Handle screen share request — backend sends { from, fromUser }
      if (voice.localScreenStream && from) {
        socket.socket?.emit('voice:screen-response', { 
          to: from, 
          streamId: voice.localScreenStream.id 
        });
      }
    };

    const handleExistingPeers = ({ peers }: { peers: Array<{ socketId: string; userId: string; username: string; avatarUrl?: string | null }>; activeScreenSharers: any[] }) => {
      for (const p of peers) {
        voice.addVoiceUser({ socketId: p.socketId, userId: p.userId, username: p.username, avatarUrl: p.avatarUrl, speaking: false, muted: false, deafened: false });
      }
    };

    // Register event listeners
    socket.socket.on('voice:user-joined', handleUserJoined);
    socket.socket.on('voice:user-left', handleUserLeft);
    socket.socket.on('voice:existing-peers', handleExistingPeers);
    socket.socket.on('voice:offer', handleOffer);
    socket.socket.on('voice:answer', handleAnswer);
    socket.socket.on('voice:ice-candidate', handleIceCandidate);
    socket.socket.on('voice:user-muted', handleUserMuted);
    socket.socket.on('voice:user-deafened', handleUserDeafened);
    socket.socket.on('voice:user-speaking', handleUserSpeaking);
    socket.socket.on('voice:amplitude', handleUserAmplitude);
    socket.socket.on('voice:screen', handlePeerScreen);
    socket.socket.on('voice:screen-request', handleScreenRequest);
    socket.socket.on('voice:user-video', handleUserVideo);

    // Cleanup
    return () => {
      socket.socket?.off('voice:user-joined', handleUserJoined);
      socket.socket?.off('voice:user-left', handleUserLeft);
      socket.socket?.off('voice:existing-peers', handleExistingPeers);
      socket.socket?.off('voice:offer', handleOffer);
      socket.socket?.off('voice:answer', handleAnswer);
      socket.socket?.off('voice:ice-candidate', handleIceCandidate);
      socket.socket?.off('voice:user-muted', handleUserMuted);
      socket.socket?.off('voice:user-deafened', handleUserDeafened);
      socket.socket?.off('voice:user-speaking', handleUserSpeaking);
      socket.socket?.off('voice:amplitude', handleUserAmplitude);
      socket.socket?.off('voice:screen', handlePeerScreen);
      socket.socket?.off('voice:screen-request', handleScreenRequest);
      socket.socket?.off('voice:user-video', handleUserVideo);
    };
  }, [socket.socket, voice.connected, voice.localStream, voice.peers, voice]);

  // ── JSX ────────────────────────────────────────────────────────────────
  // While the preview modal is open, render ONLY the modal so the panel does
  // not flash a "disconnected" state.
  if (pendingPreview && previewOpen) {
    return (
      <VoicePreviewModal
        open={previewOpen}
        channelName={pendingPreview.channelName}
        onClose={() => { setPreviewOpen(false); setPendingPreview(null); }}
        onJoin={() => {
          const target = pendingPreview;
          setPreviewOpen(false);
          setPendingPreview(null);
          if (target) {
            voice.setJoinInProgress(true);
            void joinChannel(target.channelId, target.serverId, target.rtcMode);
          }
        }}
      />
    );
  }

  if (!voice.connected) return null;

  const channelName = selectedChannel?.name || 'Voice Channel';
  // SFU participants include ourselves (1) plus everyone in the LiveKit room;
  // Mesh participants include ourselves (1) plus one RTCPeerConnection per peer.
  const participantCount = voice.transport === 'sfu'
    ? voice.voiceUsers.length + 1
    : voice.peers.size + 1;
  const hasVideo = voice.localVideo || voice.screenSharing || voice.remoteVideoStreams.size > 0 || voice.remoteScreenStreams.size > 0;
  const isSfu = voice.transport === 'sfu';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: poppedOut ? 'fixed' : 'static',
        top: poppedOut ? 80 : 'auto',
        left: poppedOut ? 24 : 'auto',
        width: poppedOut ? 320 : 'auto',
        zIndex: poppedOut ? 9998 : 'auto',
        background: poppedOut ? 'var(--dark-matter)' : 'transparent',
        border: poppedOut ? '1px solid var(--rim)' : 'none',
        borderRadius: poppedOut ? 12 : 0,
        boxShadow: poppedOut ? '0 16px 48px rgba(0,0,0,0.55)' : 'none',
        cursor: poppedOut ? 'move' : 'default',
        userSelect: poppedOut ? 'none' : 'auto',
      }}
      onMouseDown={poppedOut ? (e) => {
        const startX = e.clientX - 24;
        const startY = e.clientY - 80;
        const onMove = (ev: MouseEvent) => {
          // pin to viewport bounds
          const maxX = window.innerWidth - 320;
          const maxY = window.innerHeight - 100;
          const nx = Math.max(8, Math.min(maxX, ev.clientX - startX));
          const ny = Math.max(8, Math.min(maxY, ev.clientY - startY));
          (e.currentTarget as HTMLElement).style.left = nx + 'px';
          (e.currentTarget as HTMLElement).style.top = ny + 'px';
        };
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      } : undefined}
    >
      {/* Video grid — only shown when there are active video sources */}
      {hasVideo && <VoiceVideoGrid />}
      {/* Voice control bar */}
      <div
        style={{
          borderTop: '1px solid var(--rim)',
          background: 'var(--abyss)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
      {/* Channel indicator */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--toxic)',
              boxShadow: '0 0 6px var(--toxic)',
            }}
          />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--ghost-white)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {channelName}
          </span>
          {/* Transport badge: SFU = LiveKit-powered (scales to large groups),
              mesh = default small-group WebRTC mesh. */}
          {isSfu && (
            <span
              title="LiveKit SFU — scales beyond mesh's 6-peer limit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '1px 6px',
                background: 'rgba(110, 86, 207, 0.18)',
                border: '1px solid rgba(110, 86, 207, 0.45)',
                borderRadius: '4px',
                fontSize: '9px',
                fontWeight: 700,
                color: '#a99bf5',
                letterSpacing: '0.08em',
                marginLeft: 4,
              }}
            >
              SFU
            </span>
          )}
          {/* Go Live badge */}
          {/* Pop-out / minimize toggle */}
          <button
            type="button"
            onClick={() => setPoppedOut(v => !v)}
            title={poppedOut ? 'Dock panel' : 'Pop out'}
            aria-label="Pop out panel"
            style={{
              background: poppedOut ? 'var(--void-purple)' : 'transparent',
              border: '1px solid var(--rim)',
              borderRadius: '4px',
              color: poppedOut ? '#fff' : 'var(--ash)',
              width: 22, height: 22,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = poppedOut ? 'var(--void-purple)' : 'transparent')}
          >
            {poppedOut ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
          </button>
          {voice.screenSharing && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                background: 'rgba(74,194,82,0.15)',
                border: '1px solid rgba(74,194,82,0.4)',
                borderRadius: '4px',
                fontSize: '9px',
                fontWeight: 700,
                color: 'var(--toxic)',
                letterSpacing: '0.08em',
                animation: 'livePulse 2s ease-in-out infinite',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--toxic)' }} />
              LIVE
            </span>
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {participantCount} participant{participantCount !== 1 ? 's' : ''}
          {voice.screenSharing && (
            <span style={{ color: 'var(--toxic)', marginLeft: '8px' }}>
              · {voice.remoteStreams.size + 1} viewing
            </span>
          )}
        </div>
      </div>

      {/* Avatar + visualizer */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {voice.localStream && (
          <AudioVisualizer 
            active={voice.localSpeaking} 
            amplitude={voice.voiceUsers.find(u => u.socketId === 'local')?.amplitude || 0} 
            width={36} 
            height={36} 
          />
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {/* Mute */}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={voice.localMuted ? 'Unmute' : 'Mute'}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: (settings.pushToTalk && pttActive)
            ? 'var(--toxic)'
            : voice.localMuted ? 'var(--blood)' : 'var(--bg-modifier-accent)',
            color: (settings.pushToTalk && pttActive) || voice.localMuted ? '#fff' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
            boxShadow: (settings.pushToTalk && pttActive) ? '0 0 12px var(--toxic)' : 'none',
          }}
        >
          {voice.localMuted ? <MicOff size={16} /> : <Mic size={16} />}
          {settings.pushToTalk && (
            <span style={{
              position: 'absolute',
              bottom: '-2px', right: '-2px',
              background: pttActive ? 'var(--toxic)' : 'var(--obsidian)',
              color: pttActive ? '#0e1411' : 'var(--ash)',
              fontSize: 8, fontWeight: 700,
              padding: '1px 4px', borderRadius: 4,
              border: '1px solid var(--rim)',
              letterSpacing: '0.04em',
            }}>
              {pttActive ? 'LIVE' : settings.pushToTalkKey?.toUpperCase() || 'V'}
            </span>
          )}
        </button>

        {/* Deafen */}
        <button
          type="button"
          onClick={toggleDeafen}
          aria-label={voice.localDeafened ? 'Undeafen' : 'Deafen'}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: voice.localDeafened ? 'var(--blood)' : 'var(--bg-modifier-accent)',
            color: voice.localDeafened ? '#fff' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
          }}
        >
          {voice.localDeafened ? <VolumeX size={16} /> : <Headphones size={16} />}
        </button>

        {/* Voice filter */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowFilterMenu(v => !v)}
            aria-label="Voice filters"
            title={VOICE_FILTERS[voiceFilter].description}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: voiceFilter !== 'none' ? 'rgba(217,201,141,0.15)' : 'var(--bg-modifier-accent)',
              color: voiceFilter !== 'none' ? '#d9c98d' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
              fontSize: '14px',
            }}
          >
            {VOICE_FILTERS[voiceFilter].icon}
          </button>
          {showFilterMenu && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: '8px',
              background: 'var(--dark-matter)',
              border: '1px solid var(--rim)',
              borderRadius: '8px',
              padding: '8px',
              minWidth: '160px',
              zIndex: 100,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}>
              <div style={{ fontSize: '10px', color: 'var(--ash)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '6px' }}>
                VOICE FILTER
              </div>
              {(Object.keys(VOICE_FILTERS) as VoiceFilter[]).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setVoiceFilter(f);
                    localStorage.setItem('vox_voice_filter', f);
                    setShowFilterMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '6px 8px',
                    background: voiceFilter === f ? 'rgba(217,201,141,0.1)' : 'transparent',
                    border: voiceFilter === f ? '1px solid rgba(217,201,141,0.3)' : '1px solid transparent',
                    borderRadius: '4px',
                    color: voiceFilter === f ? '#d9c98d' : 'var(--ghost-white)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{VOICE_FILTERS[f].icon}</span>
                  <span style={{ flex: 1 }}>{VOICE_FILTERS[f].label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Inline camera permission error */}
        <MediaPermissionPanel
          kind="microphone"
          open={micErrorOpen}
          error={micError}
          onRetry={async () => {
            if (!pendingPreview) { setMicErrorOpen(false); return; }
            await voice.clearAll();
            requestJoinChannel(
              pendingPreview.channelId,
              pendingPreview.serverId,
              pendingPreview.channelName,
              pendingPreview.rtcMode,
            );
          }}
          onDismiss={() => setMicErrorOpen(false)}
        />

        <MediaPermissionPanel
          kind="camera"
          open={videoErrorOpen}
          error={videoError}
          onRetry={() => toggleVideo()}
          onDismiss={() => setVideoErrorOpen(false)}
        />
        {/* Video toggle */}
        <button
          type="button"
          onClick={toggleVideo}
          aria-label={voice.localVideo ? 'Stop video' : 'Start video'}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: voice.localVideo ? 'var(--discord-blurple)' : 'var(--bg-modifier-accent)',
            color: voice.localVideo ? '#fff' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
          }}
        >
          <Camera size={16} />
        </button>

        {/* Screen share */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={toggleScreenShare}
            aria-label={voice.screenSharing ? 'Stop sharing' : 'Share screen'}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: voice.screenSharing ? 'var(--void-purple)' : 'var(--bg-modifier-accent)',
              color: voice.screenSharing ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            <Monitor size={16} />
          </button>
          {/* Quality settings gear — visible on hover */}
          <button
            type="button"
            onClick={() => setShowQualityMenu(v => !v)}
            aria-label="Screen share quality settings"
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              border: '1px solid var(--rim)',
              background: 'var(--dark-matter)',
              color: 'var(--ash)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              opacity: 0.7,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
          >
            <Settings size={8} />
          </button>
          {/* Quality menu popover */}
          {showQualityMenu && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                right: 0,
                marginBottom: '8px',
                background: 'var(--dark-matter)',
                border: '1px solid var(--rim)',
                borderRadius: '8px',
                padding: '12px',
                minWidth: '200px',
                zIndex: 100,
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--ash)', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.05em' }}>
                SCREEN SHARE QUALITY
              </div>
              {(['smooth', 'balanced', 'sharp'] as ScreenQuality[]).map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setScreenQuality(q);
                    localStorage.setItem('vox_screen_quality', q);
                    setShowQualityMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '6px 8px',
                    background: screenQuality === q ? 'rgba(74,194,82,0.1)' : 'transparent',
                    border: screenQuality === q ? '1px solid rgba(74,194,82,0.3)' : '1px solid transparent',
                    borderRadius: '4px',
                    color: screenQuality === q ? 'var(--toxic)' : 'var(--ghost-white)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: screenQuality === q ? 'var(--toxic)' : 'var(--rim)' }} />
                  <span style={{ flex: 1 }}>
                    {q === 'smooth' ? 'Smooth (720p/15fps)' : q === 'balanced' ? 'Balanced (1080p/30fps)' : 'Sharp (1080p/60fps)'}
                  </span>
                </button>
              ))}
              <div style={{ height: '1px', background: 'var(--rim)', margin: '8px 0' }} />
              <button
                type="button"
                onClick={() => {
                  const newVal = !captureAudio;
                  setCaptureAudio(newVal);
                  localStorage.setItem('vox_screen_audio', String(newVal));
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '6px 8px',
                  background: captureAudio ? 'rgba(74,194,82,0.1)' : 'transparent',
                  border: captureAudio ? '1px solid rgba(74,194,82,0.3)' : '1px solid transparent',
                  borderRadius: '4px',
                  color: captureAudio ? 'var(--toxic)' : 'var(--ghost-white)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textAlign: 'left',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: captureAudio ? 'var(--toxic)' : 'var(--rim)' }} />
                <span style={{ flex: 1 }}>Capture System Audio</span>
              </button>
            </div>
          )}
        </div>

        {/* Music queue */}
        <button
          type="button"
          onClick={() => setMusicBarOpen((v) => !v)}
          title={'Music queue (' + (musicBarOpen ? 'hide' : 'show') + ')'}
          aria-label="Music queue"
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: musicBarOpen ? 'var(--gold)' : 'transparent',
            color: musicBarOpen ? '#0E0E12' : 'var(--gold)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          <Music size={16} />
        </button>

        {/* Leave */}
        <button
          type="button"
          onClick={leaveChannel}
          aria-label="Leave voice channel"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: 'var(--blood)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
          }}
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
    </div>
  );
};

export default VoiceChannelPanel;
