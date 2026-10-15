import { Router } from 'express';
import path from 'node:path';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { publicUser } from '../lib/auth.js';
import { badRequest, notFound } from '../lib/http.js';
import { log } from '../lib/telemetry.js';
import { disconnectUser, emitAll, emitToUser, emitToAdmins, notify, notifyAdmins, online, socketCount } from '../lib/realtime.js';
import { awardPoints, settleInvoice } from '../lib/ledger.js';
import { UPLOAD_DIR } from './finance.js';
import { expireSessions, UNIT_MS } from './hub.js';
import { VEHICLES } from './transit.js';
import { telemetryDb } from '../lib/telemetryDb.js';
import { saveBroadcast, getBroadcastHistory, deleteBroadcast, type BroadcastEntry, type BroadcastType, type BroadcastSeverity, type BroadcastTarget } from '../lib/broadcasts.js';
import crypto from 'node:crypto';

export const adminRouter = Router();

const actor = (req: { user?: { fullName: string } }) => req.user!.fullName;

// ─── Overview & telemetry ───────────────────────────────────────────────────

adminRouter.get('/overview', async (_req, res) => {
  await expireSessions();
  const [activeDesks, totalMembers, pendingProofs, openOrders, pendingRides, revenue, logs] = await Promise.all([
    prisma.booking.count({ where: { status: 'ACTIVE', item: { category: { in: ['DESK', 'FACILITY'] } } } }),
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.paymentProof.count({ where: { status: 'PENDING' } }),
    prisma.loungeOrder.count({ where: { status: { in: ['PLACED', 'PREPARING', 'READY'] } } }),
    prisma.transitRequest.count({ where: { status: 'REQUESTED' } }),
    prisma.invoice.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    prisma.telemetryLog.findMany({ orderBy: { createdAt: 'desc' }, take: 40 }),
  ]);
  res.json({
    activeDesks,
    totalMembers,
    pendingQueue: pendingProofs + openOrders,
    pendingRides,
    totalRevenue: revenue._sum.amount ?? 0,
    logs,
  });
});

adminRouter.get('/telemetry', async (_req, res) => {
  const [logs, users, invoices, messages, rides] = await Promise.all([
    prisma.telemetryLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.user.count(),
    prisma.invoice.count(),
    prisma.chatMessage.count(),
    prisma.transitRequest.count(),
  ]);
  const mem = process.memoryUsage();
  res.json({
    system: {
      uptimeSec: Math.round(process.uptime()),
      node: process.version,
      platform: `${process.platform}/${process.arch}`,
      rssMb: Math.round(mem.rss / 1048576),
      heapUsedMb: Math.round(mem.heapUsed / 1048576),
      heapTotalMb: Math.round(mem.heapTotal / 1048576),
      sockets: socketCount(),
      onlineUsers: online.size,
    },
    counts: { users, invoices, messages, rides },
    logs,
  });
});

adminRouter.get('/rental-devices', async (req, res) => {
  const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  
  let query = 'SELECT * FROM devices';
  let params: any[] = [];
  
  if (search) {
    query += ' WHERE serial_number ILIKE $1 OR hostname ILIKE $1';
    params.push(`%${search}%`);
  }
  
  query += ' ORDER BY created_at_utc DESC';
  
  try {
    const { rows: devices } = await telemetryDb.query(query, params);
    res.json(devices);
  } catch (error) {
    console.error('Failed to fetch rental devices', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

adminRouter.get('/rental-devices/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw badRequest('Invalid device ID');

    const deviceRes = await telemetryDb.query('SELECT * FROM devices WHERE id = $1', [id]);
    if (deviceRes.rows.length === 0) throw notFound('Device');
    const device = deviceRes.rows[0];

    // Fetch active session if any
    const sessionRes = await telemetryDb.query(
      `SELECT ls.*, u.full_name as user_name, u.email as user_email 
       FROM login_sessions ls 
       JOIN users u ON ls.user_id = u.id 
       WHERE ls.device_id = $1 AND ls.logout_time_utc IS NULL 
       ORDER BY ls.login_time_utc DESC LIMIT 1`,
      [id]
    );
    const activeSession = sessionRes.rows[0] || null;

    let webQuery = 'SELECT * FROM agent_browser_visit_events WHERE device_id = $1';
    let appQuery = 'SELECT * FROM agent_app_usage_events WHERE device_id = $1';
    let loginQuery = `SELECT ls.*, u.full_name as user_name, u.email as user_email FROM login_sessions ls JOIN users u ON ls.user_id = u.id WHERE ls.device_id = $1`;
    
    let params: any[] = [id];
    let paramCount = 1;
    
    const { start_date, end_date } = req.query;
    if (typeof start_date === 'string' && start_date) {
      paramCount++;
      webQuery += ` AND visit_time_utc >= $${paramCount}`;
      appQuery += ` AND start_time_utc >= $${paramCount}`;
      loginQuery += ` AND ls.login_time_utc >= $${paramCount}`;
      params.push(start_date);
    }
    if (typeof end_date === 'string' && end_date) {
      paramCount++;
      webQuery += ` AND visit_time_utc <= $${paramCount}`;
      appQuery += ` AND start_time_utc <= $${paramCount}`;
      loginQuery += ` AND ls.login_time_utc <= $${paramCount}`;
      params.push(end_date + ' 23:59:59'); // include the whole day
    }
    
    webQuery += ' ORDER BY visit_time_utc DESC LIMIT 100';
    appQuery += ' ORDER BY start_time_utc DESC LIMIT 100';
    loginQuery += ' ORDER BY ls.login_time_utc DESC LIMIT 100';

    // Fetch history
    const [webRes, appRes, loginRes] = await Promise.all([
      telemetryDb.query(webQuery, params),
      telemetryDb.query(appQuery, params),
      telemetryDb.query(loginQuery, params)
    ]);

    res.json({ 
      device, 
      activeSession,
      webHistory: webRes.rows,
      appHistory: appRes.rows,
      loginHistory: loginRes.rows
    });
  } catch (error: any) {
    console.error('Failed to fetch rental device details', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch device details' });
  }
});

// ─── User directory ─────────────────────────────────────────────────────────

adminRouter.get('/users', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const users = await prisma.user.findMany({
    where: q ? { OR: [{ fullName: { contains: q } }, { email: { contains: q } }] } : {},
    orderBy: { createdAt: 'desc' },
    include: { invoices: { where: { status: { in: ['PENDING', 'AWAITING_REVIEW'] } }, select: { status: true } } },
  });
  res.json(
    users.map(({ invoices, ...u }: any) => ({
      ...publicUser(u as typeof u & { passwordHash: string }),
      paymentStatus: invoices.some((i: any) => i.status === 'AWAITING_REVIEW')
        ? 'AWAITING_REVIEW'
        : invoices.length 
          ? 'OUTSTANDING'
          : 'CLEAR',
      online: online.has(u.id),
    })),
  );
});

adminRouter.get('/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      invoices: { orderBy: { createdAt: 'desc' }, take: 20 },
      payments: { orderBy: { createdAt: 'desc' }, take: 20 },
      courseAccess: { include: { course: { select: { title: true, fullPrice: true } } } },
      bookings: { orderBy: { createdAt: 'desc' }, take: 20, include: { item: { select: { name: true } } } },
    },
  });
  if (!user) throw notFound('User');
  res.json({ ...publicUser(user), online: online.has(user.id) });
});

const userPatch = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  tier: z.enum(['PAY_AS_YOU_GO', 'PRO_MONTHLY', 'VIP']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
  verified: z.boolean().optional(),
  pointsDelta: z.number().int().min(-100000).max(100000).optional(),
});

adminRouter.patch('/users/:id', async (req, res) => {
  const { pointsDelta, ...data } = userPatch.parse(req.body);
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) throw notFound('User');
  const self = target.id === req.user!.id;
  if (self && data.role === 'USER') throw badRequest('You cannot remove your own admin role');
  if (self && data.status && data.status !== 'ACTIVE') throw badRequest('You cannot suspend your own account');
  if (data.email && data.email !== target.email && (await prisma.user.findUnique({ where: { email: data.email } }))) {
    throw badRequest('That email is already in use');
  }

  await prisma.user.update({ where: { id: target.id }, data });
  if (pointsDelta) {
    const floor = -target.points; // never let a balance go negative
    await awardPoints(target.id, Math.max(pointsDelta, floor));
  }

  const changes = Object.entries({ ...data, ...(pointsDelta ? { points: `${pointsDelta > 0 ? '+' : ''}${pointsDelta}` } : {}) })
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  await log('ADMIN', `${actor(req)} updated ${target.fullName}: ${changes || 'no changes'}`, req.user!.id);

  if (data.status && data.status !== 'ACTIVE') disconnectUser(target.id);
  else if (data.role && data.role !== target.role) {
    await notify(target.id, 'Role updated', `Your account role is now ${data.role}. Sign in again to refresh access.`);
  }
  const updated = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
  emitToUser(target.id, 'profile:changed', null);
  res.json(publicUser(updated));
});

// ─── Action queue: payment proofs & lounge orders ──────────────────────────

adminRouter.get('/queue', async (_req, res) => {
  const [proofs, orders, reviewed, bookings, enrollments, rides] = await Promise.all([
    prisma.paymentProof.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, fullName: true, email: true } }, invoice: true },
    }),
    prisma.loungeOrder.findMany({
      where: { status: { in: ['PLACED', 'PREPARING', 'READY'] } },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { fullName: true } } },
    }),
    prisma.paymentProof.findMany({
      where: { status: { not: 'PENDING' } },
      orderBy: { reviewedAt: 'desc' },
      take: 15,
      include: { user: { select: { fullName: true } }, invoice: { select: { description: true } } },
    }),
    prisma.booking.findMany({
      where: { status: { in: ['PENDING_PAYMENT', 'CONFIRMED', 'ACTIVE'] } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        item: { select: { id: true, name: true, category: true, unit: true, price: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.userCourse.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        course: { select: { id: true, title: true, fullPrice: true, level: true } },
      },
    }),
    prisma.transitRequest.findMany({
      where: { status: { in: ['REQUESTED', 'ASSIGNED', 'EN_ROUTE'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { id: true, fullName: true, phone: true } },
        rider: { select: { id: true, name: true, phone: true } },
      },
    }),
  ]);
  const strip = <T extends { receiptUrl: string }>({ receiptUrl, ...p }: T) => ({ ...p, receiptType: path.extname(receiptUrl) });
  res.json({
    proofs: proofs.map(strip),
    orders,
    reviewed: reviewed.map(strip),
    bookings,
    enrollments,
    rides,
  });
});

adminRouter.get('/proofs/:id/receipt', async (req, res) => {
  const proof = await prisma.paymentProof.findUnique({ where: { id: req.params.id } });
  if (!proof) throw notFound('Proof');
  res.sendFile(path.join(UPLOAD_DIR, path.basename(proof.receiptUrl)));
});

adminRouter.post('/proofs/:id/approve', async (req, res) => {
  const { note } = z.object({ note: z.string().trim().max(300).optional() }).parse(req.body ?? {});
  const proof = await prisma.paymentProof.findUnique({ where: { id: req.params.id }, include: { invoice: true, user: true } });
  if (!proof) throw notFound('Proof');
  if (proof.status !== 'PENDING') throw badRequest(`Proof already ${proof.status.toLowerCase()}`);

  await prisma.paymentProof.update({
    where: { id: proof.id },
    data: { status: 'APPROVED', reviewNote: note, reviewedAt: new Date() },
  });
  if (proof.invoice) await settleInvoice(proof.invoice);
  else await notify(proof.userId, 'Payment approved', `Your transfer of ₦${proof.amount.toLocaleString()} was verified.`);

  await log('ADMIN', `${actor(req)} approved ₦${proof.amount.toLocaleString()} from ${proof.user.fullName}${proof.invoice ? ` for ${proof.invoice.description}` : ''}`, req.user!.id);
  emitToUser(proof.userId, 'profile:changed', null);
  res.json({ ok: true });
});

adminRouter.post('/proofs/:id/reject', async (req, res) => {
  const { note } = z.object({ note: z.string().trim().min(3, 'Give the member a reason').max(300) }).parse(req.body);
  const proof = await prisma.paymentProof.findUnique({ where: { id: req.params.id }, include: { user: true } });
  if (!proof) throw notFound('Proof');
  if (proof.status !== 'PENDING') throw badRequest(`Proof already ${proof.status.toLowerCase()}`);

  await prisma.paymentProof.update({
    where: { id: proof.id },
    data: { status: 'REJECTED', reviewNote: note, reviewedAt: new Date() },
  });
  if (proof.invoiceId) {
    await prisma.invoice.updateMany({ where: { id: proof.invoiceId, status: 'AWAITING_REVIEW' }, data: { status: 'PENDING' } });
  }
  await notify(proof.userId, 'Payment proof rejected', note);
  await log('ADMIN', `${actor(req)} rejected proof from ${proof.user.fullName}: ${note}`, req.user!.id);
  res.json({ ok: true });
});

adminRouter.patch('/lounge/:id', async (req, res) => {
  const { status } = z.object({ status: z.enum(['PREPARING', 'READY', 'DELIVERED', 'CANCELLED']) }).parse(req.body);
  const order = await prisma.loungeOrder.update({ where: { id: req.params.id }, data: { status } });
  const copy: Record<string, string> = {
    PREPARING: 'Your lounge order is being prepared.',
    READY: 'Your lounge order is ready for pickup at the counter.',
    DELIVERED: 'Enjoy your meal!',
    CANCELLED: 'Your lounge order was cancelled. Visit the counter for details.',
  };
  await notify(order.userId, 'Lounge order update', copy[status]);
  res.json(order);
});

// ─── Hub assets (catalog + bookings) ────────────────────────────────────────

const CATEGORIES = ['DESK', 'FACILITY', 'PROGRAM', 'HARDWARE', 'LOUNGE'] as const;
const assetSchema = z.object({
  category: z.enum(CATEGORIES),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).default(''),
  price: z.coerce.number().min(0).max(100_000_000),
  unit: z.enum(['hour', 'day', 'month', 'item']),
  totalCapacity: z.coerce.number().int().min(0).max(10_000).default(10),
  available: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

adminRouter.get('/assets', async (_req, res) => {
  await expireSessions();
  const [rawItems, bookings] = await Promise.all([
    prisma.catalogItem.findMany({
      include: {
        bookings: {
          where: { status: { in: ['ACTIVE', 'CONFIRMED'] } },
          select: { quantity: true },
        },
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    }),
    prisma.booking.findMany({
      where: { status: { in: ['PENDING_PAYMENT', 'CONFIRMED', 'ACTIVE', 'COMPLETED'] } },
      orderBy: { createdAt: 'desc' },
      include: { item: { select: { name: true, category: true } }, user: { select: { fullName: true } } },
    }),
  ]);

  const items = rawItems.map((item) => {
    const { bookings: itemBookings, ...rest } = item;
    const maxCapacity = (item as any).totalCapacity ?? 10;
    const bookedUnits = itemBookings.length;
    const availableUnits = Math.max(0, maxCapacity - bookedUnits);
    return {
      ...rest,
      totalCapacity: maxCapacity,
      maxCapacity,
      bookedUnits,
      availableUnits,
    };
  });

  res.json({ items, bookings });
});

adminRouter.post('/assets', async (req, res) => {
  const item = await prisma.catalogItem.create({ data: assetSchema.parse(req.body) });
  await log('ADMIN', `${actor(req)} added asset ${item.name} (₦${item.price}/${item.unit})`, req.user!.id);
  emitAll('catalog:changed', { action: 'create', item });
  res.status(201).json(item);
});

adminRouter.patch('/assets/:id', async (req, res) => {
  const item = await prisma.catalogItem.update({ where: { id: req.params.id }, data: assetSchema.partial().parse(req.body) });
  await log('ADMIN', `${actor(req)} updated asset ${item.name}`, req.user!.id);
  emitAll('catalog:changed', { action: 'update', item });
  res.json(item);
});

adminRouter.delete('/assets/:id', async (req, res) => {
  const used = await prisma.booking.count({ where: { itemId: req.params.id } });
  // Keep history intact: assets with bookings are retired, not deleted.
  const item = used
    ? await prisma.catalogItem.update({ where: { id: req.params.id }, data: { available: false } })
    : await prisma.catalogItem.delete({ where: { id: req.params.id } });
  await log('ADMIN', `${actor(req)} ${used ? 'retired' : 'deleted'} asset ${item.name}`, req.user!.id);
  emitAll('catalog:changed', { action: 'delete', id: req.params.id, retired: Boolean(used) });
  res.json({ retired: Boolean(used) });
});

adminRouter.patch('/bookings/:id', async (req, res) => {
  const { status } = z
    .object({ status: z.enum(['PENDING_PAYMENT', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED']) })
    .parse(req.body);
  const booking = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status },
    include: { item: true, user: true },
  });
  await log('ADMIN', `${actor(req)} marked booking ${booking.item.name} (${booking.user.fullName}) as ${status}`, req.user!.id);
  await notify(booking.userId, 'Booking update', `Your booking for ${booking.item.name} is now ${status.toLowerCase().replace('_', ' ')}.`);
  emitToUser(booking.userId, 'bookings:changed', null);
  emitToAdmins('queue:changed', null);
  res.json(booking);
});

adminRouter.post('/hardware/:id/handover', async (req, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { item: true, user: true },
  });
  if (!booking) throw notFound('Booking');
  if (booking.item.category !== 'HARDWARE') throw badRequest('Only hardware rentals can be handed over');
  if (booking.status !== 'CONFIRMED') throw badRequest(`Booking cannot be handed over (Current status: ${booking.status})`);

  const now = new Date();
  const durationMs = booking.quantity * (UNIT_MS[booking.item.unit] ?? (24 * 3600e3));
  const endsAt = new Date(now.getTime() + durationMs);

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: 'ACTIVE',
      startsAt: now,
      endsAt,
    },
    include: { item: true, user: true },
  });

  const dueStr = endsAt.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
  await log('ADMIN', `${actor(req)} handed over ${booking.item.name} to ${booking.user.fullName} (Due: ${dueStr})`, req.user!.id);
  await notify(
    booking.userId,
    'Hardware Rental Active',
    `Your workstation (${booking.item.name}) has been handed over. Return deadline is ${dueStr}.`
  );
  await notifyAdmins(
    'Hardware Handover Confirmed',
    `${booking.item.name} handed over to ${booking.user.fullName}. Due: ${dueStr}.`
  );

  emitToUser(booking.userId, 'bookings:changed', null);
  emitToAdmins('queue:changed', null);
  emitAll('catalog:changed', { action: 'update', id: booking.itemId });

  res.json(updated);
});

adminRouter.post('/hardware/:id/return', async (req, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { item: true, user: true },
  });
  if (!booking) throw notFound('Booking');
  if (booking.item.category !== 'HARDWARE') throw badRequest('Only hardware rentals can be returned');
  if (booking.status !== 'ACTIVE') throw badRequest(`Booking is not active (Current status: ${booking.status})`);

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'COMPLETED' },
    include: { item: true, user: true },
  });

  await log('ADMIN', `${actor(req)} accepted return of ${booking.item.name} from ${booking.user.fullName}`, req.user!.id);
  await notify(
    booking.userId,
    'Hardware Return Confirmed',
    `Thank you! Your workstation (${booking.item.name}) has been received and checked in. Hope it powered your work well!`
  );
  await notifyAdmins(
    'Hardware Returned',
    `${booking.item.name} has been returned by ${booking.user.fullName} and returned to fleet.`
  );

  emitToUser(booking.userId, 'bookings:changed', null);
  emitToAdmins('queue:changed', null);
  emitAll('catalog:changed', { action: 'update', id: booking.itemId });

  res.json(updated);
});

// ─── Academy courses & pricing ──────────────────────────────────────────────

const courseSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).default(''),
  level: z.string().trim().default('Beginner'),
  durationWeeks: z.coerce.number().int().min(1).max(52).default(8),
  fullPrice: z.coerce.number().min(0).max(100_000_000),
  halfPrice: z.coerce.number().min(0).max(100_000_000).optional(),
  slug: z.string().trim().optional(),
});

adminRouter.get('/courses', async (_req, res) => {
  const courses = await prisma.course.findMany({
    orderBy: { fullPrice: 'desc' },
    include: {
      _count: { select: { enrolledUsers: true } },
    },
  });
  res.json(courses);
});

adminRouter.post('/courses', async (req, res) => {
  const data = courseSchema.parse(req.body);
  const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const halfPrice = data.halfPrice !== undefined ? data.halfPrice : Math.round(data.fullPrice / 2);
  const course = await prisma.course.create({
    data: {
      ...data,
      slug,
      halfPrice,
      modulesJson: '[]',
    },
  });
  await log('ADMIN', `${actor(req)} created course ${course.title} (₦${course.fullPrice.toLocaleString()})`, req.user!.id);
  emitAll('courses:changed', { action: 'create', course });
  res.status(201).json(course);
});

adminRouter.patch('/courses/:id', async (req, res) => {
  const parsed = courseSchema.partial().parse(req.body);
  if (parsed.fullPrice !== undefined && parsed.halfPrice === undefined) {
    parsed.halfPrice = Math.round(parsed.fullPrice / 2);
  }
  const course = await prisma.course.update({
    where: { id: req.params.id },
    data: parsed,
  });
  await log('ADMIN', `${actor(req)} updated course ${course.title} (₦${course.fullPrice.toLocaleString()})`, req.user!.id);
  emitAll('courses:changed', { action: 'update', course });
  res.json(course);
});

adminRouter.delete('/courses/:id', async (req, res) => {
  const enrolled = await prisma.userCourse.count({ where: { courseId: req.params.id } });
  if (enrolled > 0) {
    throw badRequest('Cannot delete a course that has enrolled members');
  }
  const course = await prisma.course.delete({ where: { id: req.params.id } });
  await log('ADMIN', `${actor(req)} deleted course ${course.title}`, req.user!.id);
  emitAll('courses:changed', { action: 'delete', id: req.params.id });
  res.json({ deleted: true });
});

// ─── Riders & transit dispatch ──────────────────────────────────────────────

const riderSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(5).max(30),
  vehicleType: z.enum(VEHICLES),
  plate: z.string().trim().max(20).default(''),
  available: z.boolean().default(true),
});

adminRouter.get('/riders', async (_req, res) => {
  const [riders, rides] = await Promise.all([
    prisma.rider.findMany({ orderBy: { name: 'asc' } }),
    prisma.transitRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: { rider: true, user: { select: { fullName: true, phone: true } } },
    }),
  ]);
  res.json({ riders, rides });
});

adminRouter.post('/riders', async (req, res) => {
  const rider = await prisma.rider.create({ data: riderSchema.parse(req.body) });
  await log('ADMIN', `${actor(req)} onboarded rider ${rider.name} (${rider.vehicleType})`, req.user!.id);
  res.status(201).json(rider);
});

adminRouter.patch('/riders/:id', async (req, res) => {
  res.json(await prisma.rider.update({ where: { id: req.params.id }, data: riderSchema.partial().parse(req.body) }));
});

adminRouter.delete('/riders/:id', async (req, res) => {
  const rider = await prisma.rider.delete({ where: { id: req.params.id } });
  await log('ADMIN', `${actor(req)} removed rider ${rider.name}`, req.user!.id);
  res.json({ ok: true });
});

adminRouter.post('/transit/:id/assign', async (req, res) => {
  const { riderId } = z.object({ riderId: z.string() }).parse(req.body);
  const [ride, rider] = await Promise.all([
    prisma.transitRequest.findUnique({ where: { id: req.params.id } }),
    prisma.rider.findUnique({ where: { id: riderId } }),
  ]);
  if (!ride) throw notFound('Ride');
  if (!rider) throw notFound('Rider');
  if (!['REQUESTED', 'ASSIGNED'].includes(ride.status)) throw badRequest('Ride is no longer awaiting dispatch');
  if (!rider.available && rider.id !== ride.riderId) throw badRequest(`${rider.name} is on another trip`);

  if (ride.riderId && ride.riderId !== rider.id) {
    await prisma.rider.update({ where: { id: ride.riderId }, data: { available: true } });
  }
  await prisma.rider.update({ where: { id: rider.id }, data: { available: false } });
  const updated = await prisma.transitRequest.update({
    where: { id: ride.id },
    data: { riderId: rider.id, status: 'ASSIGNED' },
    include: { rider: true },
  });
  emitToUser(ride.userId, 'transit:update', updated);
  await notify(ride.userId, 'Rider assigned', `${rider.name} (${rider.vehicleType} ${rider.plate}) is heading to ${ride.pickupLocation}.`);
  await log('ADMIN', `${actor(req)} dispatched ${rider.name} to ${ride.pickupLocation}`, req.user!.id);
  res.json(updated);
});

adminRouter.patch('/transit/:id', async (req, res) => {
  const { status } = z.object({ status: z.enum(['EN_ROUTE', 'COMPLETED', 'CANCELLED']) }).parse(req.body);
  const ride = await prisma.transitRequest.findUnique({ where: { id: req.params.id } });
  if (!ride) throw notFound('Ride');
  const updated = await prisma.transitRequest.update({ where: { id: ride.id }, data: { status }, include: { rider: true } });
  if (status !== 'EN_ROUTE' && ride.riderId) {
    await prisma.rider.update({ where: { id: ride.riderId }, data: { available: true } });
  }
  emitToUser(ride.userId, 'transit:update', updated);
  if (status === 'EN_ROUTE') await notify(ride.userId, 'Rider en route', 'Your rider has picked you up. Safe trip!');
  res.json(updated);
});

// ─── Events & games ─────────────────────────────────────────────────────────

const eventSchema = z.object({
  kind: z.enum(['EVENT', 'GAME']),
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).default(''),
  location: z.string().trim().max(120).default('L.E.G.I.T Hub, Ibadan'),
  startsAt: z.coerce.date().nullable().optional(),
  capacity: z.coerce.number().int().min(1).max(10000).default(50),
  externalUrl: z.string().trim().url().nullable().optional().or(z.literal('').transform(() => null)),
});

adminRouter.get('/events', async (_req, res) => {
  res.json(
    await prisma.hubEvent.findMany({
      orderBy: [{ kind: 'asc' }, { startsAt: 'asc' }],
      include: { _count: { select: { rsvps: true } } },
    }),
  );
});

adminRouter.post('/events', async (req, res) => {
  const event = await prisma.hubEvent.create({ data: eventSchema.parse(req.body) });
  await log('ADMIN', `${actor(req)} published ${event.kind.toLowerCase()} "${event.title}"`, req.user!.id);
  res.status(201).json(event);
});

adminRouter.patch('/events/:id', async (req, res) => {
  res.json(await prisma.hubEvent.update({ where: { id: req.params.id }, data: eventSchema.partial().parse(req.body) }));
});

adminRouter.delete('/events/:id', async (req, res) => {
  const event = await prisma.hubEvent.delete({ where: { id: req.params.id } });
  await log('ADMIN', `${actor(req)} removed "${event.title}"`, req.user!.id);
  res.json({ ok: true });
});

// ─── Partner network ────────────────────────────────────────────────────────

adminRouter.get('/partners', async (_req, res) => {
  res.json(await prisma.partner.findMany({ orderBy: { name: 'asc' } }));
});

adminRouter.post('/partners', async (req, res) => {
  const data = z
    .object({
      name: z.string().trim().min(2).max(100),
      category: z.string().trim().min(2).max(40),
      website: z.string().trim().url().optional().or(z.literal('').transform(() => undefined)),
      description: z.string().trim().max(300).default(''),
    })
    .parse(req.body);
  const partner = await prisma.partner.create({ data });
  await log('ADMIN', `${actor(req)} added partner ${partner.name}`, req.user!.id);
  res.status(201).json(partner);
});

adminRouter.delete('/partners/:id', async (req, res) => {
  await prisma.partner.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ─── Global ledger ──────────────────────────────────────────────────────────

adminRouter.get('/ledger', async (req, res) => {
  const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : undefined;
  const [invoices, totals] = await Promise.all([
    prisma.invoice.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { user: { select: { fullName: true, email: true } } },
    }),
    prisma.invoice.groupBy({ by: ['status', 'kind'], _sum: { amount: true }, _count: true }),
  ]);
  res.json({ invoices, totals });
});

adminRouter.post('/ledger/:id/void', async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) throw notFound('Invoice');
  if (invoice.status !== 'PENDING') throw badRequest('Only pending invoices can be voided');
  await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'VOID' } });
  if (invoice.kind === 'BOOKING') await prisma.booking.update({ where: { id: invoice.refId! }, data: { status: 'CANCELLED' } });
  await log('ADMIN', `${actor(req)} voided invoice "${invoice.description}"`, req.user!.id);
  res.json({ ok: true });
});

// ─── Comms: support threads & broadcasts ────────────────────────────────────

adminRouter.get('/comms/threads', async (_req, res) => {
  const groups = await prisma.chatMessage.groupBy({
    by: ['channel'],
    where: { channel: { startsWith: 'support:' } },
    _max: { createdAt: true },
    _count: true,
  });
  const userIds = groups.map((g: any) => g.channel.slice('support:'.length));
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true, email: true } });
  const threads = await Promise.all(
    groups.map(async (g: any) => {
      const last = await prisma.chatMessage.findFirst({
        where: { channel: g.channel },
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: { role: true } } },
      });
      return {
        channel: g.channel,
        user: users.find((u: any) => `support:${u.id}` === g.channel) ?? null,
        count: g._count,
        lastAt: g._max.createdAt,
        lastMessage: last?.content ?? '',
        awaitingReply: last?.sender.role !== 'ADMIN',
      };
    }),
  );
  threads.sort((a, b) => +new Date(b.lastAt!) - +new Date(a.lastAt!));
  res.json(threads);
});

adminRouter.get('/comms/broadcast/history', (_req, res) => {
  res.json(getBroadcastHistory());
});

adminRouter.post('/comms/broadcast', async (req, res) => {
  const schema = z.object({
    title: z.string().trim().min(2).max(100),
    body: z.string().trim().min(2).max(1000),
    type: z.enum(['POPUP', 'NOTIFICATION', 'BANNER', 'COMBO']).default('NOTIFICATION'),
    target: z.enum(['ALL', 'TIER', 'USER']).default('ALL'),
    targetUserId: z.string().optional(),
    tier: z.enum(['PAY_AS_YOU_GO', 'PRO_MONTHLY', 'VIP']).optional(),
    severity: z.enum(['INFO', 'SUCCESS', 'WARNING', 'URGENT']).default('INFO'),
    actionUrl: z.string().trim().max(200).optional(),
    actionLabel: z.string().trim().max(40).optional(),
  });

  const parsed = schema.parse(req.body);

  // Resolve target audience
  let recipients: { id: string; fullName: string }[] = [];
  if (parsed.target === 'USER') {
    if (!parsed.targetUserId) {
      throw badRequest('targetUserId is required when target is USER');
    }
    const targetUser = await prisma.user.findUnique({
      where: { id: parsed.targetUserId },
      select: { id: true, fullName: true },
    });
    if (!targetUser) throw notFound('Target user');
    recipients = [targetUser];
  } else if (parsed.target === 'TIER') {
    if (!parsed.tier) {
      throw badRequest('tier is required when target is TIER');
    }
    recipients = await prisma.user.findMany({
      where: { status: 'ACTIVE', tier: parsed.tier as any },
      select: { id: true, fullName: true },
    });
  } else {
    // ALL active members
    recipients = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, fullName: true },
    });
  }

  const broadcastEntry: BroadcastEntry = {
    id: crypto.randomUUID(),
    type: parsed.type as BroadcastType,
    title: parsed.title,
    body: parsed.body,
    target: parsed.target as BroadcastTarget,
    targetUserId: parsed.targetUserId,
    targetUserName: parsed.target === 'USER' && recipients[0] ? recipients[0].fullName : undefined,
    tier: parsed.tier,
    severity: parsed.severity as BroadcastSeverity,
    actionUrl: parsed.actionUrl || undefined,
    actionLabel: parsed.actionLabel || undefined,
    senderId: req.user!.id,
    senderName: actor(req),
    deliveredCount: recipients.length,
    createdAt: new Date().toISOString(),
  };

  saveBroadcast(broadcastEntry);

  // Permanently record in user notifications so offline and online members always have it in their notifications log
  await Promise.all(recipients.map((u) => notify(u.id, parsed.title, parsed.body)));

  // Deliver real-time popup if requested
  if (parsed.type === 'POPUP' || parsed.type === 'COMBO') {
    if (parsed.target === 'ALL') {
      emitAll('broadcast:popup', broadcastEntry);
    } else {
      for (const u of recipients) {
        emitToUser(u.id, 'broadcast:popup', broadcastEntry);
      }
    }
  }

  // Deliver real-time top banner if requested
  if (parsed.type === 'BANNER') {
    if (parsed.target === 'ALL') {
      emitAll('broadcast:banner', broadcastEntry);
    } else {
      for (const u of recipients) {
        emitToUser(u.id, 'broadcast:banner', broadcastEntry);
      }
    }
  }

  await log(
    'ADMIN',
    `${actor(req)} dispatched ${parsed.type} broadcast "${parsed.title}" [${parsed.severity}] to ${recipients.length} members`,
    req.user!.id,
  );

  res.json({ delivered: recipients.length, broadcast: broadcastEntry });
});

adminRouter.delete('/comms/broadcast/:id', async (req, res) => {
  const removed = deleteBroadcast(req.params.id);
  if (!removed) throw notFound('Broadcast');

  // Purge any notification records delivered to members for this broadcast
  const deletedNotifs = await prisma.notification.deleteMany({
    where: {
      title: removed.title,
      body: removed.body,
    },
  });

  // Notify all online clients that this broadcast was recalled
  emitAll('broadcast:recalled', { id: removed.id, title: removed.title });

  await log(
    'ADMIN',
    `${actor(req)} recalled/deleted broadcast "${removed.title}" (purged ${deletedNotifs.count} member notification records)`,
    req.user!.id,
  );

  res.json({ ok: true, deleted: true, removedCount: deletedNotifs.count });
});


