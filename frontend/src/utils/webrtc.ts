// WebRTC configuration for voice channels
export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// Create a peer connection for a remote user
//
// The `onTrack` callback receives the owning peer's socketId, the
// MediaStream that the browser associated with the track, and the
// MediaStreamTrack itself. Callers can use the track kind to decide
// whether to route it into a generic remote-streams map (audio) or a
// dedicated screen-streams map (video) so a renegotiation that adds a
// screen video track doesn't clobber the audio MediaStream already
// stored under the same socketId.
export function createPeerConnection(
  peerId: string,
  onIceCandidate: (candidate: RTCIceCandidate) => void,
  onTrack: (peerId: string, stream: MediaStream, track: MediaStreamTrack) => void,
): RTCPeerConnection {
  const pc = new RTCPeerConnection(RTC_CONFIG);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  };

  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (stream && event.track) {
      onTrack(peerId, stream, event.track);
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      pc.close();
    }
  };

  return pc;
}

// Add local stream tracks to peer connection
export function addLocalTracksToPeer(
  pc: RTCPeerConnection,
  localStream: MediaStream,
): void {
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });
}

// Create and set local description (offer)
export async function createOffer(
  pc: RTCPeerConnection,
): Promise<RTCSessionDescriptionInit> {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  return offer;
}

// Create and set local description (answer)
export async function createAnswer(
  pc: RTCPeerConnection,
): Promise<RTCSessionDescriptionInit> {
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
}

// Set remote description from offer/answer
export async function setRemoteDescription(
  pc: RTCPeerConnection,
  description: RTCSessionDescriptionInit,
): Promise<void> {
  await pc.setRemoteDescription(new RTCSessionDescription(description));
}

// Add ICE candidate
export async function addIceCandidate(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInit,
): Promise<void> {
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (e) {
  }
}

// Get microphone media stream
export async function getMicrophoneStream(): Promise<MediaStream> {
  // Clear Electron's cached permission decisions before requesting mic.
  // Prevents a stale denial from blocking subsequent getUserMedia calls.
  try {
    const w = window as unknown as { electronAPI?: { clearPermissionCache?: () => Promise<boolean> } };
    if (w.electronAPI?.clearPermissionCache) {
      await w.electronAPI.clearPermissionCache();
    }
  } catch { /* non-Electron or unavailable */ }

  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
}

// Screen share quality presets
export type ScreenQuality = 'smooth' | 'balanced' | 'sharp';

const QUALITY_PRESETS: Record<ScreenQuality, { width: number; height: number; frameRate: number }> = {
  smooth: { width: 1280, height: 720, frameRate: 15 },
  balanced: { width: 1920, height: 1080, frameRate: 30 },
  sharp: { width: 1920, height: 1080, frameRate: 60 },
};

// Get display share stream with quality preset
export async function getDisplayStream(
  quality: ScreenQuality = 'balanced',
  captureAudio: boolean = true,
): Promise<MediaStream> {
  const preset = QUALITY_PRESETS[quality];
  return navigator.mediaDevices.getDisplayMedia({
    video: {
      width: { ideal: preset.width },
      height: { ideal: preset.height },
      frameRate: { ideal: preset.frameRate },
    },
    audio: captureAudio,
  });
}
