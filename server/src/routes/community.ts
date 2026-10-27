import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, notFound } from '../lib/http.js';
import { resolveChannel } from '../lib/channels.js';
import { decryptMessage } from '../lib/crypto.js';
import { online } from '../lib/realtime.js';
import { publicUser } from '../lib/auth.js';
import { getActiveBroadcastsForUser, getAllBroadcastsForUser, acknowledgeBroadcast } from '../lib/broadcasts.js';

export const communityRouter = Router();

communityRouter.get('/events', async (req, res) => {
  const events = await prisma.hubEvent.findMany({
    orderBy: [{ kind: 'asc' }, { startsAt: 'asc' }],
    include: { rsvps: { select: { userId: true } } },
  });
  res.json(
    events.map(({ rsvps, ...e }) => ({
      ...e,
      rsvpCount: rsvps.length,
      attending: rsvps.some((r) => r.userId === req.user!.id),
    })),
  );
});

communityRouter.post('/events/:id/rsvp', async (req, res) => {
  const event = await prisma.hubEvent.findUnique({ where: { id: req.params.id }, include: { _count: { select: { rsvps: true } } } });
  if (!event || event.kind !== 'EVENT') throw notFound('Event');
  const key = { eventId_userId: { eventId: event.id, userId: req.user!.id } };
  const existing = await prisma.eventRsvp.findUnique({ where: key });
  if (existing) {
    await prisma.eventRsvp.delete({ where: key });
    return void res.json({ attending: false });
  }
  if (event._count.rsvps >= event.capacity) throw new HttpError(409, 'This event is fully booked');
  await prisma.eventRsvp.create({ data: { eventId: event.id, userId: req.user!.id } });
  res.json({ attending: true });
});

communityRouter.get('/network/members', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const members = await prisma.user.findMany({
    where: { status: 'ACTIVE', ...(q ? { fullName: { contains: q } } : {}) },
    select: { id: true, fullName: true, tier: true, badge: true, role: true },
    orderBy: { fullName: 'asc' },
    take: 100,
  });
  res.json(members.map((m: any) => ({ ...m, online: online.has(m.id) })));
});

communityRouter.get('/network/messages', async (req, res) => {
  const channel = resolveChannel(req.user!, req.query.channel);
  const rawMessages = await prisma.chatMessage.findMany({
    where: { channel },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { sender: { select: { id: true, fullName: true, role: true, tier: true } } },
  });

  const messages = rawMessages.reverse().map((m) => ({
    ...m,
    content: decryptMessage(m.content, channel),
  }));

  res.json({ channel, messages });
});

communityRouter.get('/notifications', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({ where: { userId: req.user!.id, read: false } }),
  ]);
  res.json({ items, unread });
});

communityRouter.patch('/notifications/:id/read', async (req, res) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user!.id },
    data: { read: true },
  });
  res.json({ ok: true });
});

communityRouter.post('/notifications/read-all', async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } });
  res.json({ ok: true });
});

// Active unacknowledged broadcasts for user (popups/banners for offline/reconnecting members)
communityRouter.get('/comms/active', async (req, res) => {
  const active = getActiveBroadcastsForUser(req.user!.id, req.user!.tier);
  res.json(active);
});

// All broadcasts targeted to this user (for full history page)
communityRouter.get('/comms/broadcasts', async (req, res) => {
  const all = getAllBroadcastsForUser(req.user!.id, req.user!.tier);
  res.json(all);
});

// Acknowledge a broadcast popup/banner
communityRouter.post('/comms/broadcast/:id/ack', async (req, res) => {
  acknowledgeBroadcast(req.params.id, req.user!.id);
  res.json({ ok: true });
});

communityRouter.patch('/profile', async (req, res) => {
  const data = z
    .object({
      fullName: z.string().trim().min(2).max(80).optional(),
      phone: z.string().trim().max(30).optional(),
      bio: z.string().trim().max(300).optional(),
    })
    .parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user!.id }, data });
  res.json({ user: publicUser(user) });
});
