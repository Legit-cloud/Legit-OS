import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { log } from '../lib/telemetry.js';

export const publicRouter = Router();

publicRouter.post('/newsletter', async (req, res) => {
  const { email } = z.object({ email: z.string().trim().toLowerCase().email() }).parse(req.body);
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  if (!existing) {
    await prisma.newsletterSubscriber.create({ data: { email } });
    await log('INFO', `Newsletter subscription: ${email}`);
  }
  res.status(existing ? 200 : 201).json({ ok: true, alreadySubscribed: Boolean(existing) });
});

publicRouter.get('/events', async (_req, res) => {
  const events = await prisma.hubEvent.findMany({
    where: { kind: 'EVENT', startsAt: { gte: new Date() } },
    orderBy: { startsAt: 'asc' },
    take: 3,
  });
  res.json(events);
});
