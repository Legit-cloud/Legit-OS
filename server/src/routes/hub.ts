import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { badRequest, HttpError, notFound } from '../lib/http.js';
import { log } from '../lib/telemetry.js';
import { emitToAdmins } from '../lib/realtime.js';

export const hubRouter = Router();

const BOOKABLE = ['DESK', 'FACILITY', 'PROGRAM', 'HARDWARE'];
const CHECK_IN = ['DESK', 'FACILITY'];
const UNIT_MS: Record<string, number> = { hour: 3600e3, day: 24 * 3600e3, month: 30 * 24 * 3600e3 };

/** Flips sessions whose time has run out to COMPLETED. */
export async function expireSessions() {
  await prisma.booking.updateMany({
    where: { status: 'ACTIVE', endsAt: { lt: new Date() } },
    data: { status: 'COMPLETED' },
  });
}

hubRouter.get('/catalog', async (_req, res) => {
  const items = await prisma.catalogItem.findMany({
    where: { available: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  });
  res.json(items);
});

hubRouter.get('/bookings', async (req, res) => {
  await expireSessions();
  const bookings = await prisma.booking.findMany({
    where: { userId: req.user!.id },
    include: { item: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(bookings);
});

hubRouter.post('/bookings', async (req, res) => {
  const { itemId, quantity } = z
    .object({ itemId: z.string(), quantity: z.coerce.number().int().min(1).max(720) })
    .parse(req.body);
  const item = await prisma.catalogItem.findUnique({ where: { id: itemId } });
  if (!item || !item.available || !BOOKABLE.includes(item.category)) throw notFound('Bookable item');

  const amount = item.price * quantity;
  const booking = await prisma.booking.create({
    data: { userId: req.user!.id, itemId, quantity, amount },
    include: { item: true },
  });
  const invoice = await prisma.invoice.create({
    data: {
      userId: req.user!.id,
      kind: 'BOOKING',
      refId: booking.id,
      amount,
      description: `${item.name} × ${quantity} ${item.unit}${quantity > 1 ? 's' : ''}`,
    },
  });
  await log('INFO', `${req.user!.fullName} booked ${invoice.description}`, req.user!.id);
  emitToAdmins('queue:changed', null);
  res.status(201).json({ booking, invoice });
});

hubRouter.post('/bookings/:id/checkin', async (req, res) => {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: { item: true },
  });
  if (!booking) throw notFound('Booking');
  if (booking.status !== 'CONFIRMED') throw badRequest('Only confirmed (paid) bookings can be checked in');
  if (!CHECK_IN.includes(booking.item.category)) throw badRequest('This booking does not need a check-in');

  const now = new Date();
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: 'ACTIVE',
      startsAt: now,
      endsAt: new Date(now.getTime() + booking.quantity * (UNIT_MS[booking.item.unit] ?? UNIT_MS.hour)),
    },
    include: { item: true },
  });
  await log('INFO', `${req.user!.fullName} checked in to ${booking.item.name}`, req.user!.id);
  res.json(updated);
});

hubRouter.post('/bookings/:id/cancel', async (req, res) => {
  const booking = await prisma.booking.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
  if (!booking) throw notFound('Booking');
  if (booking.status !== 'PENDING_PAYMENT') throw badRequest('Only unpaid bookings can be cancelled');
  const awaiting = await prisma.invoice.findFirst({ where: { refId: booking.id, status: 'AWAITING_REVIEW' } });
  if (awaiting) throw new HttpError(409, 'A payment for this booking is already under review');

  await prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } });
  await prisma.invoice.updateMany({ where: { refId: booking.id, status: 'PENDING' }, data: { status: 'VOID' } });
  res.json({ ok: true });
});

const orderSchema = z.object({
  items: z.array(z.object({ itemId: z.string(), qty: z.number().int().min(1).max(20) })).max(20),
  customItem: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(240).optional(),
});

hubRouter.post('/lounge/orders', async (req, res) => {
  const data = orderSchema.parse(req.body);
  if (data.items.length === 0 && !data.customItem) throw badRequest('Your order is empty');

  const menu = await prisma.catalogItem.findMany({
    where: { id: { in: data.items.map((i) => i.itemId) }, category: 'LOUNGE', available: true },
  });
  const lines = data.items.map((line) => {
    const item = menu.find((m) => m.id === line.itemId);
    if (!item) throw badRequest('One of the menu items is no longer available');
    return { name: item.name, qty: line.qty, price: item.price };
  });
  const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);

  const order = await prisma.loungeOrder.create({
    data: {
      userId: req.user!.id,
      itemsJson: JSON.stringify(lines),
      customItem: data.customItem || null,
      notes: data.notes || null,
      total,
    },
  });
  let invoice = null;
  if (total > 0) {
    invoice = await prisma.invoice.create({
      data: {
        userId: req.user!.id,
        kind: 'LOUNGE',
        refId: order.id,
        amount: total,
        description: `Lounge order: ${lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}`,
      },
    });
  }
  await log('INFO', `Lounge order from ${req.user!.fullName} (₦${total.toLocaleString()})`, req.user!.id);
  emitToAdmins('queue:changed', null);
  res.status(201).json({ order, invoice });
});

hubRouter.get('/lounge/orders', async (req, res) => {
  const orders = await prisma.loungeOrder.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json(orders);
});
