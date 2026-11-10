import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { badRequest, HttpError, notFound } from '../lib/http.js';
import { log } from '../lib/telemetry.js';
import { emitAll, notifyAdmins } from '../lib/realtime.js';

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

  const progressRecords = await prisma.lessonProgress.findMany({
    where: { userId: req.user!.id, courseId: course.id, completed: true },
  });
  const completedLessonIds = progressRecords.map((p: any) => p.lessonId);

  const modules = JSON.parse(course.modulesJson);
  let totalLessons = 0;
  for (const m of modules) {
    if (Array.isArray(m.lessons)) {
      totalLessons += m.lessons.length;
    }
  }
  const progressPercent = totalLessons > 0 ? Math.min(100, Math.round((completedLessonIds.length / totalLessons) * 100)) : 0;
  const { modulesJson, ...rest } = course;

  res.json({
    course: rest,
    modules,
    enrollment,
    completedLessonIds,
    progressPercent,
  });
});

academyRouter.post('/courses/:id/lessons/:lessonId/toggle', async (req, res) => {
  const userId = req.user!.id;
  const { id: courseId, lessonId } = req.params;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw notFound('Course');

  const enrollment = await prisma.userCourse.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment || enrollment.paidAmount < course.halfPrice - 0.01) {
    throw new HttpError(403, 'Enrollment required to track lesson progress');
  }

  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_courseId_lessonId: { userId, courseId, lessonId } },
  });

  let isCompletedNow = true;
  let pointsAwarded = 0;

  if (existing) {
    isCompletedNow = !existing.completed;
    await prisma.lessonProgress.update({
      where: { id: existing.id },
      data: { completed: isCompletedNow, completedAt: new Date() },
    });
  } else {
    await prisma.lessonProgress.create({
      data: { userId, courseId, lessonId, completed: true },
    });
    // Award 10 Hub points for finishing a lesson!
    pointsAwarded = 10;
    await prisma.user.update({
      where: { id: userId },
      data: { points: { increment: pointsAwarded } },
    });
  }

  const progressRecords = await prisma.lessonProgress.findMany({
    where: { userId, courseId, completed: true },
  });
  const completedLessonIds = progressRecords.map((p: any) => p.lessonId);

  const modules = JSON.parse(course.modulesJson);
  let totalLessons = 0;
  for (const m of modules) {
    if (Array.isArray(m.lessons)) totalLessons += m.lessons.length;
  }
  const progressPercent = totalLessons > 0 ? Math.min(100, Math.round((completedLessonIds.length / totalLessons) * 100)) : 0;

  res.json({
    ok: true,
    completed: isCompletedNow,
    pointsAwarded,
    completedLessonIds,
    progressPercent,
  });
});

academyRouter.get('/courses/:id/discussions', async (req, res) => {
  const { id: courseId } = req.params;
  const channelPrefix = `classroom:${courseId}`;

  const messages = await prisma.chatMessage.findMany({
    where: {
      channel: { startsWith: channelPrefix },
    },
    include: {
      sender: { select: { id: true, fullName: true, role: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  res.json(
    messages.map((m) => {
      // Channel format: "classroom:<courseId>:<lessonId>"
      const parts = m.channel.split(':');
      const lessonId = parts[2] || 'default';
      return {
        id: m.id,
        channel: m.channel,
        lessonId,
        userId: m.sender.id,
        userName: m.sender.fullName,
        userRole: m.sender.role,
        text: m.content,
        createdAt: m.createdAt,
      };
    })
  );
});

academyRouter.post('/courses/:id/lessons/:lessonId/discussions', async (req, res) => {
  const user = req.user!;
  const { id: courseId, lessonId } = req.params;
  const { text } = z.object({ text: z.string().trim().min(2).max(1000) }).parse(req.body);

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw notFound('Course');

  // Verify access (enrolled student or admin)
  if (user.role !== 'ADMIN') {
    const enrollment = await prisma.userCourse.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (!enrollment || enrollment.paidAmount < course.halfPrice - 0.01) {
      throw new HttpError(403, 'Enrollment required to participate in class discussions');
    }
  }

  const channel = `classroom:${courseId}:${lessonId}`;
  const message = await prisma.chatMessage.create({
    data: {
      channel,
      senderId: user.id,
      content: text,
    },
    include: {
      sender: { select: { id: true, fullName: true, role: true, username: true } },
    },
  });

  // Extract lesson title from course modulesJson for friendly notification
  let lessonTitle = 'Lesson';
  try {
    const modules = JSON.parse(course.modulesJson);
    for (const m of modules) {
      const found = (m.lessons || []).find((l: any) => l.id === lessonId);
      if (found) {
        lessonTitle = found.title || 'Lesson';
        break;
      }
    }
  } catch {}

  // If posted by a student, notify all Admins & Instructors in real-time!
  if (user.role !== 'ADMIN') {
    const preview = text.length > 90 ? text.slice(0, 90) + '…' : text;
    await notifyAdmins(
      'New Classroom Question',
      `${user.fullName} asked a question in ${course.title} (${lessonTitle}): "${preview}"`
    );
  }

  const payload = {
    id: message.id,
    channel: message.channel,
    lessonId,
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    text: message.content,
    createdAt: message.createdAt,
  };

  // Real-time broadcast to all viewers in this classroom channel
  emitAll('classroom:question', {
    courseId,
    lessonId,
    question: payload,
  });

  res.status(201).json(payload);
});


