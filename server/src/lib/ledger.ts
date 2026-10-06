import type { Invoice } from '@prisma/client';
import { prisma } from './prisma.js';
import { notify } from './realtime.js';

const POINTS_PER_PAYMENT = 50;

function badgeFor(points: number) {
  if (points >= 1000) return 'Hub Legend';
  if (points >= 500) return 'Power Builder';
  if (points >= 150) return 'Rising Innovator';
  return 'New Member';
}

export async function awardPoints(userId: string, delta: number) {
  const user = await prisma.user.update({ where: { id: userId }, data: { points: { increment: delta } } });
  const badge = badgeFor(user.points);
  if (badge !== user.badge) await prisma.user.update({ where: { id: userId }, data: { badge } });
}

/** Marks an invoice paid and unlocks whatever it was paying for. */
export async function settleInvoice(invoice: Invoice) {
  if (invoice.status === 'PAID') return;
  await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'PAID', paidAt: new Date() } });

  switch (invoice.kind) {
    case 'COURSE': {
      const course = await prisma.course.findUniqueOrThrow({ where: { id: invoice.refId! } });
      const key = { userId_courseId: { userId: invoice.userId, courseId: course.id } };
      const existing = await prisma.userCourse.findUnique({ where: key });
      const paidAmount = (existing?.paidAmount ?? 0) + invoice.amount;
      const isFullyPaid = paidAmount >= course.fullPrice - 0.01;
      await prisma.userCourse.upsert({
        where: key,
        create: { userId: invoice.userId, courseId: course.id, paidAmount, isFullyPaid },
        update: { paidAmount, isFullyPaid },
      });
      await notify(invoice.userId, 'Classroom unlocked', `You now have access to ${course.title}.`);
      break;
    }
    case 'SUBSCRIPTION': {
      const renews = new Date(Date.now() + 30 * 24 * 3600 * 1000);
      await prisma.user.update({
        where: { id: invoice.userId },
        data: { tier: invoice.refId as 'PRO_MONTHLY' | 'VIP', planRenewsAt: renews },
      });
      await notify(invoice.userId, 'Plan activated', `${invoice.description} is active until ${renews.toDateString()}.`);
      break;
    }
    case 'BOOKING':
      await prisma.booking.update({ where: { id: invoice.refId! }, data: { status: 'CONFIRMED' } });
      await notify(invoice.userId, 'Booking confirmed', `${invoice.description} is confirmed. Check in from your dashboard.`);
      break;
    case 'LOUNGE':
      await prisma.loungeOrder.update({ where: { id: invoice.refId! }, data: { status: 'PREPARING' } });
      await notify(invoice.userId, 'Order in the kitchen', 'Your lounge order is being prepared.');
      break;
    default:
      await notify(invoice.userId, 'Payment received', `${invoice.description} has been marked paid.`);
  }

  await awardPoints(invoice.userId, POINTS_PER_PAYMENT);
}

/** Keeps the daily streak current; called whenever a user loads their session. */
export async function touchStreak(userId: string, lastActiveAt: Date | null) {
  const today = new Date();
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  if (lastActiveAt && dayKey(lastActiveAt) === dayKey(today)) return;
  const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);
  const continued = lastActiveAt !== null && dayKey(lastActiveAt) === dayKey(yesterday);
  await prisma.user.update({
    where: { id: userId },
    data: { lastActiveAt: today, streakDays: continued ? { increment: 1 } : 1 },
  });
  await awardPoints(userId, 5);
}
