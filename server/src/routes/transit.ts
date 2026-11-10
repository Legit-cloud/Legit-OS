import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { badRequest, HttpError, notFound } from '../lib/http.js';
import { log } from '../lib/telemetry.js';
import { emitToAdmins } from '../lib/realtime.js';

export const transitRouter = Router();

export const VEHICLES = ['Bike', 'Keke', 'Cab'] as const;
export const FARES: Record<(typeof VEHICLES)[number], number> = { Bike: 1500, Keke: 2000, Cab: 4500 };
const LIVE = ['REQUESTED', 'ASSIGNED', 'EN_ROUTE'];

transitRouter.get('/transit', async (req, res) => {
  const rides = await prisma.transitRequest.findMany({
    where: { userId: req.user!.id },
    include: { rider: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json({ fares: FARES, rides });
});

transitRouter.post('/transit', async (req, res) => {
  const data = z
    .object({
      pickupLocation: z.string().trim().min(3, 'Enter a pickup location').max(160),
      dropoffLocation: z.string().trim().max(160).optional(),
      vehicleType: z.enum(VEHICLES),
    })
    .parse(req.body);
  const live = await prisma.transitRequest.findFirst({ where: { userId: req.user!.id, status: { in: LIVE } } });
  if (live) throw new HttpError(409, 'You already have a ride in progress');

  const ride = await prisma.transitRequest.create({
    data: {
      userId: req.user!.id,
      pickupLocation: data.pickupLocation,
      dropoffLocation: data.dropoffLocation || undefined,
      vehicleType: data.vehicleType,
      fareEstimate: FARES[data.vehicleType],
    },
    include: { rider: true },
  });
  await log('INFO', `${data.vehicleType} requested by ${req.user!.fullName} from ${data.pickupLocation}`, req.user!.id);
  emitToAdmins('transit:changed', null);
  res.status(201).json(ride);
});

transitRouter.post('/transit/:id/cancel', async (req, res) => {
  const ride = await prisma.transitRequest.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
  if (!ride) throw notFound('Ride');
  if (!['REQUESTED', 'ASSIGNED'].includes(ride.status)) throw badRequest('This ride can no longer be cancelled');
  await prisma.transitRequest.update({ where: { id: ride.id }, data: { status: 'CANCELLED' } });
  if (ride.riderId) await prisma.rider.update({ where: { id: ride.riderId }, data: { available: true } });
  emitToAdmins('transit:changed', null);
  res.json({ ok: true });
});
