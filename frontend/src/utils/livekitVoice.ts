// LiveKit SFU voice integration.
//
// This is the media path used when a voice channel has rtcMode === 'SFU' and the
// backend has LiveKit configured (LIVEKIT_* env). It is an ALTERNATIVE to the
// mesh path (Socket.io + RTCPeerConnection) — the mesh stays the default and is
// used for every channel that isn't explicitly 'SFU'. Both paths write into the
// same voiceStore shape (voiceUsers / remoteStreams / remoteVideoStreams) so the
// existing VoiceChannelPanel / VoiceVideoGrid UI renders SFU participants without
// any special-casing.
//
// Flow:
//  1. GET /api/voice/livekit-token?channelId= -> { token, url, room }
//  2. Connect a livekit-client Room, publish local mic (+ optional cam) tracks.
//  3. Map LiveKit RemoteParticipants -> voiceStore as they join/leave/publish.
import {
  Room,
  RoomEvent,
  Track,
  createLocalTracks,
  type RemoteParticipant,
  type RemoteTrackPublication,
} from 'livekit-client';
import { useVoiceStore } from '../stores/voiceStore';
import { useSocketStore } from '../stores/socketStore';
import { API_BASE } from '../api/client';
import { setupVoiceActivityDetection } from '../utils/voiceActivityDetection';

export interface SfuConnection {
  room: Room;
  disconnect: () => Promise<void>;
}

let activityCleanup: (() => void) | null = null;
let activeApplyMute: (() => void) | null = null;

function trackKindToStream(pub: RemoteTrackPublication): MediaStream | null {
  const track = pub.track;
  if (!track) return null;
  const media = (track as unknown as { mediaStreamTrack?: MediaStreamTrack }).mediaStreamTrack;
  if (!media) return null;
  return new MediaStream([media]);
}

function publishStateFor(p: RemoteParticipant) {
  const camPub = p.getTrackPublication(Track.Source.Camera);
  const screenPub = p.getTrackPublication(Track.Source.ScreenShare);
  return {
    screenSharing: Boolean(screenPub?.track),
    cameraOn: Boolean(camPub?.track),
  };
}

// Fetch a LiveKit join token from the backend for the given channel.
export async function fetchLiveKitToken(channelId: string): Promise<{ token: string; url: string; room: string }> {
  const res = await fetch(`${API_BASE}/api/voice/livekit-token?channelId=${encodeURIComponent(channelId)}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `LiveKit token request failed (${res.status})`);
  }
  return res.json();
}

// Connect to a LiveKit room for the given voice channel.
// Returns a disconnect handle. Throws if LiveKit is not reachable / not configured.
export async function connectSfu(
  channelId: string,
  serverId: string,
  opts: { camera?: boolean } = {},
): Promise<SfuConnection> {
  const voice = useVoiceStore.getState();
  const socket = useSocketStore.getState();

  const { token, url } = await fetchLiveKitToken(channelId);

  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  // Get local mic (and optional camera) tracks.
  const localTracks = await createLocalTracks({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: opts.camera
      ? { resolution: { width: 1280, height: 720 }, frameRate: 30 }
      : false,
  });
  const micTrack = localTracks.find((t) => t.kind === 'audio');

  const localStream = new MediaStream(
    localTracks.map((t) => (t as unknown as { mediaStreamTrack?: MediaStreamTrack }).mediaStreamTrack as MediaStreamTrack).filter(Boolean),
  );
  voice.setLocalStream(localStream);
  voice.setChannel(channelId, serverId);
  voice.setJoinedAt(Date.now());
  voice.setJoinInProgress(false);

  // Local speaking detection (drives the avatar ring / amplitude).
  if (micTrack) {
    activityCleanup = setupVoiceActivityDetection(
      localStream,
      () => {
        voice.setLocalSpeaking(true);
        socket.socket?.emit('voice:speaking', { speaking: true });
      },
      () => {
        voice.setLocalSpeaking(false);
        socket.socket?.emit('voice:speaking', { speaking: false });
      },
      (amplitude) => voice.setUserAmplitude('local', amplitude),
    );
  }

  // Reflect local mute/deafen over the existing mesh signaling channel too, so
  // presence (mute icons etc.) stays consistent regardless of media path.
  const applyLocalMute = () => {
    const enabled = !voice.localMuted;
    localTracks.forEach((t) => {
      if (t.kind === 'audio') {
        const audio = t as unknown as { setMuted?: (m: boolean) => void; enabled?: boolean };
        if (typeof audio.setMuted === 'function') audio.setMuted(!enabled);
        else audio.enabled = enabled;
      }
    });
  };
  activeApplyMute = applyLocalMute;

  // ── Participant events ───────────────────────────────
  const addParticipant = (p: RemoteParticipant) => {
    const identity = p.identity || p.sid;
    voice.addVoiceUser({
      socketId: identity,
      userId: identity,
      username: (p.metadata && JSON.parse(p.metadata)?.username) || p.name || identity,
      speaking: false,
      muted: !p.audioTrackPublications.size || !Array.from(p.audioTrackPublications.values())[0]?.track,
      deafened: false,
    });
    const { screenSharing } = publishStateFor(p);
    if (screenSharing) voice.setUserScreenSharing(identity, true);
  };

  const removeParticipant = (p: RemoteParticipant) => {
    const identity = p.identity || p.sid;
    voice.removeVoiceUser(identity);
    voice.clearRemoteScreenStream(identity);
    voice.clearRemoteVideoStream(identity);
  };

  const onTrackPublished = (p: RemoteParticipant, pub: RemoteTrackPublication) => {
    const identity = p.identity || p.sid;
    const stream = trackKindToStream(pub);
    if (!stream) return;
    if (pub.source === Track.Source.ScreenShare || pub.source === Track.Source.ScreenShareAudio) {
      voice.setRemoteScreenStream(identity, stream);
      voice.setUserScreenSharing(identity, true);
    } else if (pub.source === Track.Source.Camera) {
      voice.setRemoteVideoStream(identity, stream);
    } else {
      voice.addRemoteStream(identity, stream);
    }
  };

  const onTrackUnpublished = (p: RemoteParticipant, pub: RemoteTrackPublication) => {
    const identity = p.identity || p.sid;
    if (pub.source === Track.Source.ScreenShare || pub.source === Track.Source.ScreenShareAudio) {
      voice.setUserScreenSharing(identity, false);
      voice.clearRemoteScreenStream(identity);
    } else if (pub.source === Track.Source.Camera) {
      voice.clearRemoteVideoStream(identity);
    }
  };

  room
    .on(RoomEvent.ParticipantConnected, addParticipant)
    .on(RoomEvent.ParticipantDisconnected, removeParticipant)
    .on(RoomEvent.TrackPublished, (pub, p) => onTrackPublished(p as RemoteParticipant, pub as RemoteTrackPublication))
    .on(RoomEvent.TrackUnpublished, (pub, p) => onTrackUnpublished(p as RemoteParticipant, pub as RemoteTrackPublication))
    .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const speakingIds = new Set(speakers.map((s) => s.identity || s.sid));
      voice.voiceUsers.forEach((u) => {
        if (u.socketId !== 'local') {
          voice.updateVoiceUser(u.socketId, { speaking: speakingIds.has(u.socketId) });
        }
      });
    });

  // Seed already-present participants (for late joiners).
  room.remoteParticipants.forEach((p) => addParticipant(p));

  await room.connect(url, token);
  for (const t of localTracks) {
    await room.localParticipant.publishTrack(t);
  }

  // Re-apply current mute state after publish.
  applyLocalMute();

  // Also emit voice:join so the existing socket-handler member presence
  // (existing-peers broadcast, channel indicator badges, side-panel members)
  // still updates for SFU-mode users. LiveKit carries the media; the mesh
  // socket carries the room-membership signal.
  socket.socket?.emit('voice:join', { channelId, serverId });

  const disconnect = async () => {
    if (activityCleanup) { activityCleanup(); activityCleanup = null; }
    if (activeApplyMute === applyLocalMute) activeApplyMute = null;
    localTracks.forEach((t) => t.stop());
    try { await room.disconnect(); } catch (e) { /* ignore disconnect errors */ }
    socket.socket?.emit('voice:leave');
    voice.clearChannel();
  };

  // Expose a mute hook the panel can call for the SFU path.
  (voice as unknown as { _sfuApplyLocalMute?: () => void })._sfuApplyLocalMute = applyLocalMute;

  return { room, disconnect };
}

/** Re-run the most-recent SFU mute apply. Used by VoiceChannelPanel when the
 *  user toggles mute so the LiveKit LocalAudioTrack reflects the change. */
export function applySfuMute(): void {
  if (activeApplyMute) activeApplyMute();
}
