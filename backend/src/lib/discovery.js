// VOX Backend — UDP Discovery Service
// Listens for broadcast discovery packets and responds with server info.

import dgram from 'node:dgram';
import os from 'node:os';
import { env } from './env.js';

const DISCOVERY_PORT = 41234;
const DISCOVERY_MAGIC = 'VOX_DISCOVER';

let socket = null;

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

function startDiscovery() {
  socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

  socket.on('error', (err) => {
    console.error('[Discovery] Socket error:', err.message);
    socket.close();
    socket = null;
  });

  socket.on('message', (msg, rinfo) => {
    try {
      const magic = msg.toString('utf8', 0, DISCOVERY_MAGIC.length);
      if (magic !== DISCOVERY_MAGIC) return;

      console.log(`[Discovery] Got discover request from ${rinfo.address}:${rinfo.port}`);
      const localIPs = getLocalIPs();
      const payload = JSON.stringify({
        magic: DISCOVERY_MAGIC,
        service: 'vox-backend',
        version: '1.0',
        port: env.port,
        ips: localIPs,
      });

      socket.send(payload, rinfo.port, rinfo.address, (err) => {
        if (err) console.error('[Discovery] Send error:', err.message);
        else console.log(`[Discovery] Sent response to ${rinfo.address}:${rinfo.port}`);
      });
    } catch (err) {
      console.error('[Discovery] Parse error:', err.message);
    }
  });

  socket.on('listening', () => {
    socket.setBroadcast(true);
    const addr = socket.address();
    console.log(`[Discovery] Listening on ${addr.address}:${addr.port} (UDP broadcast enabled)`);
  });

  socket.bind(DISCOVERY_PORT, () => {
    console.log('[Discovery] UDP discovery service started on port', DISCOVERY_PORT);
  });
}

function stopDiscovery() {
  if (socket) {
    socket.close();
    socket = null;
    console.log('[Discovery] Stopped');
  }
}

export { startDiscovery, stopDiscovery };
