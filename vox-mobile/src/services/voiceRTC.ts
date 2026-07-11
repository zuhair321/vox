// Vox Mobile — WebRTC voice manager (mesh peer connections).
//
// Signaling rides on the existing Socket.io events already emitted by the app
// (voice:offer / voice:answer / voice:ice-candidate) and the server's
// voice:existing-peers / voice:user-joined / voice:user-left.
//
// Convention to avoid offer glare: the peer that *just joined* (the one that
// receives voice:existing-peers) initiates offers to everyone already present.
// Existing peers only answer.

import {
  mediaDevices,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
} from 'react-native-webrtc';
import { PermissionsAndroid, Platform } from 'react-native';
import { useSocketStore } from '../stores/socketStore';
import { useVoiceStore, type RemoteVoiceStream } from '../stores/voiceStore';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

class VoiceRTCManager {
  private localStream: MediaStream | null = null;
  private pcs: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private localMuted = false;
  private active = false;

  get isActive() {
    return this.active;
  }

  async start(peerSocketIds: string[]) {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone',
            message: 'VOX needs microphone access for voice chat.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('[voice] microphone permission not granted');
        }
      }

      if (!this.localStream) {
        this.localStream = await mediaDevices.getUserMedia({ audio: true, video: false });
      }

      this.localMuted = useVoiceStore.getState().isMuted;
      this.applyLocalMute();
      this.active = true;

      const myId = useSocketStore.getState().socket?.id;
      for (const id of peerSocketIds) {
        if (id === myId) continue;
        await this.createAndOffer(id);
      }
    } catch (e) {
      console.error('[voice] start failed', e);
    }
  }

  private async ensurePc(socketId: string): Promise<RTCPeerConnection> {
    let pc = this.pcs.get(socketId);
    if (pc) return pc;

    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // event-target-shim types the listener API via a `type` alias, so we cast
    // to `any` to attach handlers (works at runtime on RN WebRTC).
    const pcEvents = pc as any;
    pcEvents.addEventListener('icecandidate', (e: any) => {
      const candidate = e?.candidate;
      if (candidate) {
        const payload = typeof candidate.toJSON === 'function' ? candidate.toJSON() : candidate;
        useSocketStore.getState().sendVoiceIceCandidate(socketId, payload);
      }
    });

    pcEvents.addEventListener('track', (e: any) => {
      const stream: MediaStream | undefined = e?.streams?.[0];
      if (stream) {
        this.remoteStreams.set(socketId, stream);
        this.emit();
      }
    });

    pcEvents.addEventListener('connectionstatechange', () => {
      const state = pc?.connectionState;
      if (state === 'failed' || state === 'closed' || state === 'disconnected') {
        this.remoteStreams.delete(socketId);
        this.pcs.delete(socketId);
        this.emit();
      }
    });

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => pc!.addTrack(t, this.localStream!));
    }

    this.pcs.set(socketId, pc);
    return pc;
  }

  private async createAndOffer(socketId: string) {
    const pc = await this.ensurePc(socketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    useSocketStore.getState().sendVoiceOffer(socketId, offer);
  }

  async handleOffer(from: string, offer: any) {
    const pc = await this.ensurePc(from);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      useSocketStore.getState().sendVoiceAnswer(from, answer);
    } catch (e) {
      console.error('[voice] handleOffer failed', e);
    }
  }

  async handleAnswer(from: string, answer: any) {
    const pc = this.pcs.get(from);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (e) {
      console.error('[voice] handleAnswer failed', e);
    }
  }

  async handleIce(from: string, candidate: any) {
    const pc = this.pcs.get(from);
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('[voice] handleIce failed', e);
    }
  }

  removePeer(socketId: string) {
    const pc = this.pcs.get(socketId);
    if (pc) {
      try { pc.close(); } catch { /* ignore */ }
      this.pcs.delete(socketId);
    }
    if (this.remoteStreams.delete(socketId)) {
      this.emit();
    }
  }

  setLocalMuted(muted: boolean) {
    this.localMuted = muted;
    this.applyLocalMute();
  }

  private applyLocalMute() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = !this.localMuted;
      });
    }
  }

  private emit() {
    const list: RemoteVoiceStream[] = Array.from(this.remoteStreams.entries()).map(
      ([socketId, stream]) => ({ socketId, stream }),
    );
    useVoiceStore.getState().setRemoteStreams(list);
  }

  async leave() {
    this.pcs.forEach((pc) => {
      try { pc.close(); } catch { /* ignore */ }
    });
    this.pcs.clear();
    this.remoteStreams.clear();
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    this.active = false;
    this.emit();
  }
}

export const voiceRTC = new VoiceRTCManager();
