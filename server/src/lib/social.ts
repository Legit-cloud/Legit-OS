import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { HttpError } from './http.js';
import { notify, emitToAdmins } from './realtime.js';
import { getCanonicalDmChannel } from './channels.js';

const REPORT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const REPORTS_PER_HOUR = 10;

export interface UserReportRecord {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  reporterName?: string;
  reporterEmail?: string;
  reportedName?: string;
  reportedEmail?: string;
}

/** Order-independent key so A->B and B->A can never both exist */
const pairKey = (a: string, b: string) => [a, b].sort().join(':');

/** Latest request between two users, in either direction */
const findPair = (a: string, b: string) =>
  prisma.friendRequest.findFirst({
    where: { OR: [{ senderId: a, receiverId: b }, { senderId: b, receiverId: a }] },
    orderBy: { updatedAt: 'desc' },
  });

/**
 * Creates a report against a user and alerts hub administrators
 */
export async function createReport(
  reporterId: string,
  reportedUserId: string,
  reason: string,
  details?: string
): Promise<UserReportRecord> {
  if (reporterId === reportedUserId) {
    throw new HttpError(400, 'You cannot report yourself.');
  }

  const [reporter, reportedUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: reporterId }, select: { id: true, fullName: true, email: true } }),
    prisma.user.findUnique({ where: { id: reportedUserId }, select: { id: true, fullName: true, email: true } }),
  ]);

  if (!reporter || !reportedUser) {
    throw new HttpError(404, 'User not found');
  }

  const cleanReason = reason.trim().slice(0, 200);
  const cleanDetails = details ? details.trim().slice(0, 2000) : null;

  const now = Date.now();
  const [duplicate, recentCount] = await Promise.all([
    prisma.userReport.findFirst({
      where: {
        reporterId,
        reportedUserId,
        status: 'PENDING',
        createdAt: { gte: new Date(now - REPORT_COOLDOWN_MS) },
      },
      select: { id: true },
    }),
    prisma.userReport.count({ where: { reporterId, createdAt: { gte: new Date(now - 60 * 60 * 1000) } } }),
  ]);
  if (duplicate) throw new HttpError(429, 'You have already reported this user. Our team is reviewing it.');
  if (recentCount >= REPORTS_PER_HOUR) throw new HttpError(429, 'Too many reports. Please try again later.');

  const created = await prisma.userReport.create({
    data: { reporterId, reportedUserId, reason: cleanReason, details: cleanDetails },
  });
  const id = created.id;

  // Security telemetry log
  await prisma.telemetryLog.create({
    data: {
      level: 'SECURITY',
      actorId: reporterId,
      message: `User report: ${reporter.fullName} reported ${reportedUser.fullName} (${reportedUser.email}) for "${cleanReason}"`,
    },
  });

  // Notify all Admins
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', status: 'ACTIVE' },
    select: { id: true },
  });

  const notifyPromises = admins.map((a) =>
    notify(a.id, `⚠️ User Report Filed`, `${reporter.fullName} reported ${reportedUser.fullName}: ${cleanReason}`)
  );
  await Promise.allSettled(notifyPromises);

  emitToAdmins('user:reported', {
    reportId: id,
    reporter: reporter.fullName,
    reported: reportedUser.fullName,
    reason: cleanReason,
  });

  return {
    id,
    reporterId,
    reportedUserId,
    reason: cleanReason,
    details: cleanDetails,
    status: 'PENDING',
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
    reporterName: reporter.fullName,
    reportedName: reportedUser.fullName,
  };
}

/**
 * List all reports for the admin dashboard
 */
export async function listUserReports(): Promise<UserReportRecord[]> {
  const reports = await prisma.userReport.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      reporter: { select: { fullName: true, email: true } },
      reportedUser: { select: { fullName: true, email: true } },
    },
  });

  return reports.map((r) => ({
    id: r.id,
    reporterId: r.reporterId,
    reportedUserId: r.reportedUserId,
    reason: r.reason,
    details: r.details,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    reporterName: r.reporter?.fullName || 'Unknown',
    reporterEmail: r.reporter?.email || '',
    reportedName: r.reportedUser?.fullName || 'Unknown',
    reportedEmail: r.reportedUser?.email || '',
  }));
}

/**
 * Update report status (Admin action)
 */
export async function updateReportStatus(reportId: string, status: 'RESOLVED' | 'DISMISSED') {
  const report = await prisma.userReport.findUnique({ where: { id: reportId }, select: { status: true } });
  if (!report) throw new HttpError(404, 'Report not found');
  if (report.status !== 'PENDING') throw new HttpError(409, `Report already ${report.status.toLowerCase()}.`);

  // Conditional update guards against two admins deciding at once
  const { count } = await prisma.userReport.updateMany({ where: { id: reportId, status: 'PENDING' }, data: { status } });
  if (count === 0) throw new HttpError(409, 'Report was already handled.');
  return { ok: true };
}

/**
 * Get friendship/DM request status between two users
 */
export async function getDmRelationship(currentUserId: string, targetUserId: string) {
  if (currentUserId === targetUserId) {
    return {
      status: 'NONE' as const,
      isSender: false,
      isReceiver: false,
      canSend: false,
      sentCount: 0,
      reason: 'You cannot message yourself.',
    };
  }

  const [currentUser, targetUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: currentUserId }, select: { id: true, role: true } }),
    prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, role: true, fullName: true } }),
  ]);

  if (!currentUser || !targetUser) {
    throw new HttpError(404, 'User not found');
  }

  // Admins always have unrestricted communication capability
  if (currentUser.role === 'ADMIN' || targetUser.role === 'ADMIN') {
    return {
      status: 'ACCEPTED' as const,
      isSender: false,
      isReceiver: false,
      canSend: true,
      sentCount: 0,
      targetUser,
    };
  }

  const req = await findPair(currentUserId, targetUserId);

  // Only a not-yet-accepted conversation needs the sent-message count
  const countSent = () =>
    prisma.chatMessage.count({
      where: { channel: getCanonicalDmChannel(currentUserId, targetUserId), senderId: currentUserId },
    });

  if (!req) {
    return {
      status: 'NONE' as const,
      requestId: undefined,
      isSender: false,
      isReceiver: false,
      canSend: true, // Can send initial introductory message
      sentCount: await countSent(),
      targetUser,
    };
  }

  const isSender = req.senderId === currentUserId;
  const isReceiver = req.receiverId === currentUserId;

  if (req.status === 'ACCEPTED') {
    return {
      status: 'ACCEPTED' as const,
      requestId: req.id,
      isSender,
      isReceiver,
      canSend: true,
      sentCount: 0,
      targetUser,
    };
  }

  const sentCount = await countSent();

  if (req.status === 'REJECTED') {
    return {
      status: 'REJECTED' as const,
      requestId: req.id,
      isSender,
      isReceiver,
      canSend: false,
      sentCount,
      reason: isSender ? 'This user declined your chat request.' : 'You declined this chat request.',
      targetUser,
    };
  }

  // Status is PENDING
  if (isSender) {
    // If the sender already sent 1 message, block further messages until accepted
    const canSend = sentCount < 1;
    return {
      status: 'PENDING' as const,
      requestId: req.id,
      isSender: true,
      isReceiver: false,
      canSend,
      sentCount,
      reason: canSend
        ? undefined
        : `Waiting for ${targetUser.fullName} to accept your request before you can send more messages.`,
      targetUser,
    };
  } else {
    // Current user is receiver of a pending request
    return {
      status: 'PENDING' as const,
      requestId: req.id,
      isSender: false,
      isReceiver: true,
      canSend: true,
      sentCount,
      targetUser,
    };
  }
}

/**
 * Explicitly create or trigger a message/friend request
 */
export async function sendDmRequest(senderId: string, receiverId: string) {
  if (senderId === receiverId) {
    throw new HttpError(400, 'Cannot send request to yourself.');
  }

  const [sender, receiver] = await Promise.all([
    prisma.user.findUnique({ where: { id: senderId }, select: { id: true, fullName: true } }),
    prisma.user.findUnique({ where: { id: receiverId }, select: { id: true, fullName: true } }),
  ]);

  if (!sender || !receiver) throw new HttpError(404, 'User not found');

  const settled = (r: { id: string; status: string }) => {
    if (r.status === 'REJECTED') throw new HttpError(403, 'This user declined your chat request.');
    return { status: r.status, requestId: r.id };
  };

  const existing = await findPair(senderId, receiverId);
  if (existing) return settled(existing);

  let created;
  try {
    created = await prisma.friendRequest.create({
      data: { senderId, receiverId, pairKey: pairKey(senderId, receiverId) },
    });
  } catch (err) {
    // Lost a race with a concurrent request for the same pair
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const winner = await findPair(senderId, receiverId);
      if (winner) return settled(winner);
    }
    throw err;
  }

  await notify(receiverId, 'New Message Request', `${sender.fullName} wants to connect with you on the network.`);

  return { status: 'PENDING', requestId: created.id };
}

/**
 * Respond to a friend/message request (ACCEPT or REJECT)
 */
export async function respondDmRequest(requestId: string, userId: string, action: 'ACCEPT' | 'REJECT') {
  const req = await prisma.friendRequest.findUnique({
    where: { id: requestId },
    include: { receiver: { select: { fullName: true } } },
  });

  if (!req) throw new HttpError(404, 'Request not found');
  if (req.receiverId !== userId) {
    throw new HttpError(403, 'You are not authorized to respond to this request.');
  }
  if (req.status !== 'PENDING') {
    throw new HttpError(409, `This request was already ${req.status.toLowerCase()}.`);
  }

  const newStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
  const { count } = await prisma.friendRequest.updateMany({
    where: { id: requestId, status: 'PENDING' },
    data: { status: newStatus },
  });
  if (count === 0) throw new HttpError(409, 'This request was already answered.');

  if (action === 'ACCEPT') {
    await notify(
      req.senderId,
      'Message Request Accepted!',
      `${req.receiver.fullName} accepted your request. You can now chat freely.`
    );
  }

  return { ok: true, status: newStatus };
}

/**
 * List pending requests for a user (both incoming and outgoing)
 */
export async function listUserRequests(userId: string) {
  const person = { select: { id: true, fullName: true, tier: true, badge: true, role: true } };
  const flat = (r: { createdAt: Date; updatedAt: Date }) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  });

  const [incoming, outgoing, accepted] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: { sender: person },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendRequest.findMany({
      where: { senderId: userId, status: 'PENDING' },
      include: { receiver: person },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendRequest.findMany({
      where: { status: 'ACCEPTED', OR: [{ senderId: userId }, { receiverId: userId }] },
      include: { sender: person, receiver: person },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  return {
    incoming: incoming.map(({ sender, ...r }) => ({
      ...flat(r),
      fullName: sender.fullName,
      tier: sender.tier,
      badge: sender.badge,
      role: sender.role,
    })),
    outgoing: outgoing.map(({ receiver, ...r }) => ({
      ...flat(r),
      fullName: receiver.fullName,
      tier: receiver.tier,
      badge: receiver.badge,
      role: receiver.role,
    })),
    accepted: accepted.map(({ sender, receiver, ...r }) => {
      const friend = r.senderId === userId ? receiver : sender;
      return {
        ...flat(r),
        friendId: friend.id,
        friendName: friend.fullName,
        friendTier: friend.tier,
        friendBadge: friend.badge,
        friendRole: friend.role,
      };
    }),
  };
}
