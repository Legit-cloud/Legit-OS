import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { publicUser, requireAuth, signToken } from '../lib/auth.js';
import { HttpError } from '../lib/http.js';
import { log } from '../lib/telemetry.js';
import { notify } from '../lib/realtime.js';
import { touchStreak } from '../lib/ledger.js';

export const authRouter = Router();

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  phone: z.string().trim().max(30).optional(),
});

authRouter.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body);
  if (await prisma.user.findUnique({ where: { email: data.email } })) {
    throw new HttpError(409, 'An account with this email already exists');
  }
  const user = await prisma.user.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      passwordHash: await bcrypt.hash(data.password, 10),
    },
  });
  await notify(user.id, 'Welcome to the Hub', 'Your L.E.G.I.T OS terminal is ready. Explore Infra, Academy and Network.');
  await log('INFO', `New member registered: ${user.fullName} <${user.email}>`, user.id);
  await touchStreak(user.id, null);
  res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    await log('SECURITY', `Failed sign-in attempt for ${email}`);
    throw new HttpError(401, 'Invalid email or password');
  }
  if (user.status !== 'ACTIVE') {
    await log('SECURITY', `Blocked sign-in for ${user.status.toLowerCase()} account ${email}`, user.id);
    throw new HttpError(403, `This account is ${user.status.toLowerCase()}. Contact hello@legithub.com.`);
  }
  await log(user.role === 'ADMIN' ? 'ADMIN' : 'INFO', `${user.role === 'ADMIN' ? 'Admin' : 'Member'} session started: ${user.fullName}`, user.id);
  res.json({ token: signToken(user.id), user: publicUser(user) });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  await touchStreak(req.user!.id, req.user!.lastActiveAt);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  res.json({ user: publicUser(user) });
});

authRouter.post('/logout', requireAuth, async (req, res) => {
  const u = req.user!;
  await log(
    u.role === 'ADMIN' ? 'ADMIN' : 'INFO',
    u.role === 'ADMIN' ? `Admin session terminated: ${u.fullName}` : `Member session ended: ${u.fullName}`,
    u.id,
  );
  res.json({ ok: true });
});
