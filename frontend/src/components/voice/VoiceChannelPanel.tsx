import React, { useEffect, useCallback, useState } from 'react';
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
import { Mic, MicOff, Headphones, PhoneOff, Volume2, VolumeX, Camera, Monitor, Settings } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';

const VoiceChannelPanel: React.FC = () => {
  const voice = useVoiceStore();
  const socket = useSocketStore();
  const { selectedServer, selectedChannel } = useServerStore();
  const { addToast } = useUiStore();
  const [screenQuality, setScreenQuality] = useState<ScreenQuality>(
    () => (localStorage.getItem('vox_screen_quality') as ScreenQuality) || 'balanced'
  );
  const [captureAudio, setCaptureAudio] = useState<boolean>(
    () => localStorage.getItem('vox_screen_audio') !== 'false'
  );
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [voiceFilter, setVoiceFilter] = useState<VoiceFilter>(
    () => (localStorage.getItem('vox_voice_filter') as VoiceFilter) || 'none'
  );
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Join voice channel
  const joinChannel = useCallback(async (channelId: string, serverId: string) => {
    if (voice.connected) {
      console.warn('[Voice] Already in a channel');
      return;
    }

    try {
      voice.setJoinInProgress(true);
      const stream = await getMicrophoneStream();
      voice.setLocalStream(stream);
      voice.setChannel(channelId, serverId);
      voice.setJoinedAt(Date.now());
      console.log('[Voice] Joined channel', channelId);

      // Emit join event
      socket.socket?.emit('voice:join', { channelId, serverId }, (err?: string) => {
        if (err) {
          console.error('[Voice] Server rejected join:', err);
          addToast(`Failed to join voice: ${err}`, 'error');
          leaveChannel();
          voice.setJoinInProgress(false);
        }
      });
    } catch (err: any) {
      const errorMsg = err?.message || String(err) || 'Unknown error';
      console.error('[Voice] Error joining channel:', errorMsg);
      addToast(`Could not access microphone: ${errorMsg}`, 'error');
      voice.clearChannel();
      voice.setJoinInProgress(false);
    }
  }, [voice, socket, addToast]);

  // Leave voice channel
  const leaveChannel = useCallback(() => {
    socket.socket?.emit('voice:leave');
    voice.clearChannel();
  }, [voice, socket]);

  // Mute toggle
  const toggleMute = useCallback(() => {
    voice.setLocalMuted(!voice.localMuted);
    socket.socket?.emit('voice:mute', { muted: !voice.localMuted });
  }, [voice, socket]);

  // Deafen toggle
  const toggleDeafen = useCallback(() => {
    voice.setLocalDeafened(!voice.localDeafened);
    socket.socket?.emit('voice:deafen', { deafened: !voice.localDeafened });
  }, [voice, socket]);

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
      socket.socket?.emit('voice:video', { video: true });
    } catch (err: any) {
      addToast('Could not access camera.', 'error');
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
      if (err?.name !== 'AbortError' && err?.name !== 'NotAllowedError') {
        addToast('Could not share screen.', 'error');
      }
    }
  }, [voice, socket, addToast, screenQuality, captureAudio]);

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
      return pc;
    };

    const handleOffer = ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
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
      const pc = voice.peers.get(from);
      if (pc) {
        setRemoteDescription(pc, answer);
      }
    };

    const handleIceCandidate = ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
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

    const handleScreenRequest = ({ requesterId }: { requesterId: string }) => {
      // Handle screen share request (simplified)
      if (voice.localScreenStream) {
        socket.socket?.emit('voice:screen-response', { 
          to: requesterId, 
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
  if (!voice.connected) return null;

  const channelName = selectedChannel?.name || 'Voice Channel';
  const participantCount = voice.peers.size + 1;
  const hasVideo = voice.localVideo || voice.screenSharing || voice.remoteVideoStreams.size > 0 || voice.remoteScreenStreams.size > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
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
          {/* Go Live badge */}
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
          <AudioVisualizer active={!!voice.localStream} width={36} height={36} />
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
            background: voice.localMuted ? 'var(--blood)' : 'var(--bg-modifier-accent)',
            color: voice.localMuted ? '#fff' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
          }}
        >
          {voice.localMuted ? <MicOff size={16} /> : <Mic size={16} />}
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
