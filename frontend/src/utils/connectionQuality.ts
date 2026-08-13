// Monitors WebRTC peer connection stats (packet loss, jitter, RTT)
// and produces a coarse 0-100 quality score + a 4-bar level for UI display.

export type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor';

export interface PeerQuality {
  score: number;          // 0–100
  level: QualityLevel;    // coarse bucket
  packetsLost: number;    // cumulative packets lost (sent vs received)
  packetsLostPct: number; // lost / expected (0–100)
  jitterMs: number;       // current jitter in milliseconds
  rttMs: number | null;   // round-trip time in ms (null if unknown)
  bitrateKbps: number;    // outbound audio bitrate estimate
}

const EMPTY: PeerQuality = {
  score: 100,
  level: 'excellent',
  packetsLost: 0,
  packetsLostPct: 0,
  jitterMs: 0,
  rttMs: null,
  bitrateKbps: 0,
};

export type QualityListener = (quality: PeerQuality) => void;

interface PeerTracker {
  pc: RTCPeerConnection;
  listener: QualityListener;
  prevBytesSent: number;
  prevTs: number;
  prevPacketsLost: number;
  prevPacketsReceived: number;
  intervalId: number | null;
}

const trackers = new Map<string, PeerTracker>();

/**
 * Bucket a 0–100 score into a Discord-style 4-bar level.
 */
export function scoreToLevel(score: number): QualityLevel {
  if (score >= 85) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

/**
 * Start tracking a peer connection. Calls `listener` every `pollMs`
 * with the latest derived quality. Returns a stop function.
 */
export function trackPeer(
  peerId: string,
  pc: RTCPeerConnection,
  listener: QualityListener,
  pollMs = 2000,
): () => void {
  // Stop any previous tracker for this peer.
  stopTracking(peerId);

  const tracker: PeerTracker = {
    pc,
    listener,
    prevBytesSent: 0,
    prevTs: 0,
    prevPacketsLost: 0,
    prevPacketsReceived: 0,
    intervalId: null,
  };

  const poll = async () => {
    try {
      if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
        listener({ ...EMPTY, score: 0, level: 'poor' });
        return;
      }
      const stats = await pc.getStats();
      const q = aggregateStats(stats);
      tracker.listener(q);
      // Persist numbers for next poll so we can compute deltas.
      const nextBytes = sumOutboundBytes(stats);
      const nextLost = sumPacketsLost(stats);
      const nextRecv = sumPacketsReceived(stats);
      tracker.prevBytesSent = nextBytes;
      tracker.prevPacketsLost = nextLost;
      tracker.prevPacketsReceived = nextRecv;
      tracker.prevTs = Date.now();
    } catch {
      // pc.getStats can throw when the connection is closing; swallow.
    }
  };

  tracker.intervalId = window.setInterval(poll, pollMs);
  trackers.set(peerId, tracker);
  // Kick off an immediate poll so UI updates without waiting.
  void poll();
  return () => stopTracking(peerId);
}

export function stopTracking(peerId: string): void {
  const t = trackers.get(peerId);
  if (!t) return;
  if (t.intervalId != null) window.clearInterval(t.intervalId);
  trackers.delete(peerId);
}

export function stopAllTracking(): void {
  for (const id of Array.from(trackers.keys())) stopTracking(id);
}

function sumOutboundBytes(stats: RTCStatsReport): number {
  let total = 0;
  stats.forEach((report) => {
    if (report.type === 'outbound-rtp' && (report as any).kind === 'audio') {
      total += Number((report as any).bytesSent ?? 0);
    }
  });
  return total;
}

function sumPacketsLost(stats: RTCStatsReport): number {
  let total = 0;
  stats.forEach((report) => {
    if (report.type === 'inbound-rtp') {
      total += Number((report as any).packetsLost ?? 0);
    }
  });
  return total;
}

function sumPacketsReceived(stats: RTCStatsReport): number {
  let total = 0;
  stats.forEach((report) => {
    if (report.type === 'inbound-rtp') {
      total += Number((report as any).packetsReceived ?? 0);
    }
  });
  return total;
}

function aggregateStats(stats: RTCStatsReport): PeerQuality {
  let packetsLost = 0;
  let packetsRecv = 0;
  let jitterSec = 0;
  let rttMs: number | null = null;
  let bytesSent = 0;
  let lastBytes = 0;

  stats.forEach((report) => {
    const r = report as any;
    if (report.type === 'inbound-rtp' && r.kind === 'audio') {
      packetsLost += Number(r.packetsLost ?? 0);
      packetsRecv += Number(r.packetsReceived ?? 0);
      // jitter is in seconds on the spec
      if (typeof r.jitter === 'number') jitterSec = Math.max(jitterSec, r.jitter);
    }
    if (report.type === 'outbound-rtp' && r.kind === 'audio') {
      bytesSent += Number(r.bytesSent ?? 0);
      lastBytes = Number(r.bytesSent ?? 0);
    }
    if (report.type === 'candidate-pair' && r.state === 'succeeded' && typeof r.currentRoundTripTime === 'number') {
      rttMs = Math.round((r.currentRoundTripTime as number) * 1000);
    }
  });

  const expected = packetsLost + packetsRecv;
  const lostPct = expected > 0 ? (packetsLost / expected) * 100 : 0;
  const jitterMs = Math.round(jitterSec * 1000);

  // Score: combine lostPct, jitter, and RTT into one 0-100 number.
  // 0% loss + <30ms jitter + <100ms RTT = 100; degrade smoothly.
  let score = 100;
  score -= Math.min(lostPct * 4, 60);       // up to -60 for packet loss
  score -= Math.max(0, jitterMs - 30) * 0.4; // -0.4 per ms above 30
  if (rttMs != null) score -= Math.max(0, rttMs - 100) * 0.3;
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Bitrate estimate from outbound bytes (over the last poll window, ~2s).
  // We can't compute exact delta without prev sample here; rough proxy:
  const bitrateKbps = lastBytes > 0 ? Math.round((lastBytes * 8) / 2000) : 0;

  return {
    score,
    level: scoreToLevel(score),
    packetsLost,
    packetsLostPct: Math.round(lostPct * 10) / 10,
    jitterMs,
    rttMs,
    bitrateKbps,
  };
}
