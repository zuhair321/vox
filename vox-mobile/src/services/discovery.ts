// Vox Mobile — Auto-discovery service
// Sends UDP broadcast on local network to find the VOX backend server.

import dgram from 'react-native-udp';

const DISCOVERY_PORT = 41234;
const DISCOVERY_MAGIC = 'VOX_DISCOVER';
const BROADCAST_TIMEOUT = 4000; // ms

export interface DiscoveredServer {
  host: string;
  port: number;
  ips: string[];
}

let socket: any = null;
let resolvePromise: any = null;
let rejectPromise: any = null;

function createSocket(): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const s = dgram.createSocket({ type: 'udp4', reusePort: true });

      s.on('error', (err: any) => {
        console.error('[Discovery] socket error:', err.message);
        s.close();
        reject(err);
      });

      s.on('message', (msg: Buffer, rinfo: any) => {
        try {
          const data = JSON.parse(msg.toString('utf8'));
          if (data.magic !== DISCOVERY_MAGIC) return;
          console.log('[Discovery] Server found:', data);
          const host = rinfo.address;
          const port = data.port;
          if (resolvePromise) {
            resolvePromise({ host, port, ips: data.ips || [] });
            resolvePromise = null;
            rejectPromise = null;
          }
          s.close();
          socket = null;
        } catch {
          // ignore parse errors
        }
      });

      s.on('listening', () => {
        try {
          s.setBroadcast(true);
        } catch {
          // some platforms don't support setBroadcast
        }
        resolve(s);
      });

      // Bind to any port — we'll broadcast from this
      s.bind();
    } catch (err) {
      reject(err);
    }
  });
}

export async function discoverServer(): Promise<DiscoveredServer | null> {
  if (socket) {
    try { socket.close(); } catch { /* ignore */ }
    socket = null;
  }

  return new Promise(async (resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;

    try {
      socket = await createSocket();

      const msg = Buffer.from(DISCOVERY_MAGIC, 'utf8');

      // Broadcast to the local subnet (255.255.255.255 reaches all local devices)
      socket.send(msg, 0, msg.length, DISCOVERY_PORT, '255.255.255.255', (err: any) => {
        if (err) {
          console.error('[Discovery] broadcast error:', err.message);
          reject(err);
          return;
        }
        console.log('[Discovery] Broadcast sent, waiting for response...');
      });

      // Also try direct to localhost as fallback
      try {
        socket.send(msg, 0, msg.length, DISCOVERY_PORT, '127.0.0.1', () => {});
      } catch { /* ignore */ }

      // Timeout — no server found
      setTimeout(() => {
        if (resolvePromise) {
          console.log('[Discovery] Timeout, no server found');
          resolvePromise = null;
          rejectPromise = null;
          try { socket?.close(); } catch { /* ignore */ }
          socket = null;
          resolve(null);
        }
      }, BROADCAST_TIMEOUT);
    } catch (err) {
      resolvePromise = null;
      rejectPromise = null;
      resolve(null);
    }
  });
}
