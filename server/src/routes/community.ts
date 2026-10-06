import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, notFound } from '../lib/http.js';
import { resolveChannel } from '../lib/channels.js';
import { online } from '../lib/realtime.js';
import { publicUser } from '../lib/auth.js';

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
  res.json(members.map((m) => ({ ...m, online: online.has(m.id) })));
});

communityRouter.get('/network/messages', async (req, res) => {
  const channel = resolveChannel(req.user!, req.query.channel);
  const messages = await prisma.chatMessage.findMany({
    where: { channel },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { sender: { select: { id: true, fullName: true, role: true, tier: true } } },
  });
  res.json({ channel, messages: messages.reverse() });
});

communityRouter.get('/notifications', async (req, res) => {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.notification.count({ where: { userId: req.user!.id, read: false } }),
  ]);
  res.json({ items, unread });
});

communityRouter.post('/notifications/read-all', async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } });
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
