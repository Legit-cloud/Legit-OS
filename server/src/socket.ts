import type { Server, Socket } from 'socket.io';
import type { User } from '@prisma/client';
import { userFromToken } from './lib/auth.js';
import { prisma } from './lib/prisma.js';
import { resolveChannel, supportOwner, getDmRecipientId } from './lib/channels.js';
import { encryptMessage } from './lib/crypto.js';
import { emitToAdmins, emitToChannel, notify, online } from './lib/realtime.js';

type Ack = (res: { ok: boolean; error?: string; channel?: string }) => void;

export function setupSocket(io: Server) {
  io.use(async (socket, next) => {
    try {
      socket.data.user = await userFromToken(socket.handshake.auth?.token);
      next();
    } catch (err) {
      next(new Error((err as Error).message));
    }
  });

  const broadcastPresence = () => io.emit('presence', [...online.keys()]);

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as User;
    socket.join(`user:${user.id}`);
    if (user.role === 'ADMIN') socket.join('admins');
    online.set(user.id, (online.get(user.id) ?? 0) + 1);
    broadcastPresence();

    socket.on('chat:join', (requested: unknown, ack?: Ack) => {
      try {
        const channel = resolveChannel(user, requested);
        for (const room of socket.rooms) if (room.startsWith('chan:')) socket.leave(room);
        socket.join(`chan:${channel}`);
        ack?.({ ok: true, channel });
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('chat:send', async (payload: { channel?: unknown; content?: unknown }, ack?: Ack) => {
      try {
        const channel = resolveChannel(user, payload?.channel);
        const content = typeof payload?.content === 'string' ? payload.content.trim().slice(0, 1000) : '';
        if (!content) throw new Error('Message is empty');

        const message = await prisma.chatMessage.create({
          data: { channel, content: encryptMessage(content, channel), senderId: user.id },
          include: { sender: { select: { id: true, fullName: true, role: true, tier: true } } },
        });
        // Emit decrypted/original plaintext to the authorized room participants
        emitToChannel(channel, 'chat:message', { ...message, content });

        const owner = supportOwner(channel);
        if (owner && user.role !== 'ADMIN') emitToAdmins('support:activity', { channel });
        if (owner && user.role === 'ADMIN' && owner !== user.id) {
          await notify(owner, 'Hub Support replied', content.slice(0, 120));
        }

        const dmRecipient = getDmRecipientId(channel, user.id);
        if (dmRecipient) {
          await notify(dmRecipient, `New message from ${user.fullName}`, content.slice(0, 120));
        }
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('disconnect', () => {
      const left = (online.get(user.id) ?? 1) - 1;
      if (left <= 0) online.delete(user.id);
      else online.set(user.id, left);
      broadcastPresence();
    });
  });
}
