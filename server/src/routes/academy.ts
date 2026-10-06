import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { badRequest, HttpError, notFound } from '../lib/http.js';
import { log } from '../lib/telemetry.js';

export const academyRouter = Router();

const OPEN = ['PENDING', 'AWAITING_REVIEW'];

academyRouter.get('/courses', async (req, res) => {
  const userId = req.user!.id;
  const [courses, enrollments, openInvoices] = await Promise.all([
    prisma.course.findMany({ orderBy: { fullPrice: 'desc' } }),
    prisma.userCourse.findMany({ where: { userId } }),
    prisma.invoice.findMany({ where: { userId, kind: 'COURSE', status: { in: OPEN } } }),
  ]);
  res.json(
    courses.map(({ modulesJson, ...course }) => {
      const enrollment = enrollments.find((e) => e.courseId === course.id) ?? null;
      return {
        ...course,
        moduleCount: (JSON.parse(modulesJson) as unknown[]).length,
        enrollment,
        hasAccess: Boolean(enrollment && enrollment.paidAmount >= course.halfPrice - 0.01),
        openInvoice: openInvoices.find((i) => i.refId === course.id) ?? null,
      };
    }),
  );
});

academyRouter.post('/courses/:id/checkout', async (req, res) => {
  const { plan } = z.object({ plan: z.enum(['FULL', 'HALF', 'BALANCE']) }).parse(req.body);
  const userId = req.user!.id;
  const course = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!course) throw notFound('Course');

  const enrollment = await prisma.userCourse.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });
  if (enrollment?.isFullyPaid) throw badRequest('You have already paid for this course');
  if (plan === 'BALANCE' && !enrollment) throw badRequest('Start with a full or 50% payment');
  if (plan === 'HALF' && enrollment) throw badRequest('Pay your outstanding balance instead');

  const reviewing = await prisma.invoice.findFirst({
    where: { userId, kind: 'COURSE', refId: course.id, status: 'AWAITING_REVIEW' },
  });
  if (reviewing) throw new HttpError(409, 'A payment for this course is already under review');

  // Replace any unpaid invoice so the user only ever has one open bill per course.
  await prisma.invoice.updateMany({
    where: { userId, kind: 'COURSE', refId: course.id, status: 'PENDING' },
    data: { status: 'VOID' },
  });

  const paid = enrollment?.paidAmount ?? 0;
  const amount = plan === 'HALF' ? course.halfPrice : course.fullPrice - paid;
  const label = plan === 'FULL' ? 'full payment' : plan === 'HALF' ? '50% installment' : 'balance';
  const invoice = await prisma.invoice.create({
    data: { userId, kind: 'COURSE', refId: course.id, amount, description: `${course.title} (${label})` },
  });
  await log('INFO', `${req.user!.fullName} started checkout: ${invoice.description}`, userId);
  res.status(201).json(invoice);
});

academyRouter.get('/courses/:id/classroom', async (req, res) => {
  const course = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!course) throw notFound('Course');
  const enrollment = await prisma.userCourse.findUnique({
    where: { userId_courseId: { userId: req.user!.id, courseId: course.id } },
  });
  if (!enrollment || enrollment.paidAmount < course.halfPrice - 0.01) {
    throw new HttpError(403, 'Complete payment to enter this classroom');
  }
  const { modulesJson, ...rest } = course;
  res.json({ course: rest, modules: JSON.parse(modulesJson), enrollment });
});
