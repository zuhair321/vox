// Public chat-state routes — the contract the frontend hydrates from.
//   GET  /api/state   → full app state (channels, messages, members, nitro)
import { Router } from 'express';
import { getState, claimNitro } from '../services/chat.service.js';
import { mapChannel, mapMessage, mapMember } from '../lib/mappers.js';

export const stateRouter = Router();

stateRouter.get('/state', async (req, res, next) => {
  try {
    const { channels, messages, members, nitroClaimed } = await getState();
    res.json({
      ok: true,
      name: 'VOX',
      version: '0.2.0',
      uptime: Math.round(process.uptime()),
      channels: channels.map(mapChannel),
      messages: messages.map(mapMessage),
      onlineMembers: members.map(mapMember),
      nitroClaimed,
    });
  } catch (e) { next(e); }
});

// Demo-only Nitro claim. Kept for compatibility with the existing UI button.
stateRouter.post('/nitro/claim', (req, res) => {
  const payload = claimNitro();
  // Notify all connected sockets via the shared io instance.
  import('../sockets/index.js').then(({ emitAll }) => emitAll('nitro:claimed', payload));
  res.json(payload);
});
