import { prisma } from './prisma.js';
import { HttpError } from './http.js';
import { notify, emitToAdmins } from './realtime.js';
import { getCanonicalDmChannel } from './channels.js';
import crypto from 'node:crypto';

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

export interface FriendRequestRecord {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: string;
    fullName: string;
    tier: string;
    badge: string;
    role: string;
  };
  receiver?: {
    id: string;
    fullName: string;
    tier: string;
    badge: string;
    role: string;
  };
}

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

  const id = crypto.randomUUID();
  const cleanReason = reason.trim().slice(0, 200);
  const cleanDetails = details ? details.trim().slice(0, 2000) : null;

  await prisma.$executeRawUnsafe(
    `INSERT INTO UserReport (id, reporterId, reportedUserId, reason, details, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    id,
    reporterId,
    reportedUserId,
    cleanReason,
    cleanDetails
  );

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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reporterName: reporter.fullName,
    reportedName: reportedUser.fullName,
  };
}

/**
 * List all reports for the admin dashboard
 */
export async function listUserReports(): Promise<UserReportRecord[]> {
  const reports = await prisma.$queryRawUnsafe<any[]>(`
    SELECT r.*,
           rep.fullName as reporterName, rep.email as reporterEmail,
           tgt.fullName as reportedName, tgt.email as reportedEmail
    FROM UserReport r
    LEFT JOIN User rep ON r.reporterId = rep.id
    LEFT JOIN User tgt ON r.reportedUserId = tgt.id
    ORDER BY r.createdAt DESC
    LIMIT 100
  `);

  return reports.map((r) => ({
    id: r.id,
    reporterId: r.reporterId,
    reportedUserId: r.reportedUserId,
    reason: r.reason,
    details: r.details,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    reporterName: r.reporterName || 'Unknown',
    reporterEmail: r.reporterEmail || '',
    reportedName: r.reportedName || 'Unknown',
    reportedEmail: r.reportedEmail || '',
  }));
}

/**
 * Update report status (Admin action)
 */
export async function updateReportStatus(reportId: string, status: 'RESOLVED' | 'DISMISSED') {
  await prisma.$executeRawUnsafe(
    `UPDATE UserReport SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
    status,
    reportId
  );
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

  // Check request in database
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM FriendRequest
     WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
     LIMIT 1`,
    currentUserId,
    targetUserId,
    targetUserId,
    currentUserId
  );

  const req = rows[0] as FriendRequestRecord | undefined;
  const canonicalChannel = getCanonicalDmChannel(currentUserId, targetUserId);

  // Count messages already sent by current user in this DM
  const sentCount = await prisma.chatMessage.count({
    where: { channel: canonicalChannel, senderId: currentUserId },
  });

  if (!req) {
    return {
      status: 'NONE' as const,
      requestId: undefined,
      isSender: false,
      isReceiver: false,
      canSend: true, // Can send initial introductory message
      sentCount,
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
      sentCount,
      targetUser,
    };
  }

  if (req.status === 'REJECTED') {
    return {
      status: 'REJECTED' as const,
      requestId: req.id,
      isSender,
      isReceiver,
      canSend: false,
      sentCount,
      reason: 'This user declined your chat request.',
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

  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM FriendRequest
     WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
     LIMIT 1`,
    senderId,
    receiverId,
    receiverId,
    senderId
  );

  if (existing.length > 0) {
    const r = existing[0];
    if (r.status === 'ACCEPTED') return { status: 'ACCEPTED', requestId: r.id };
    if (r.status === 'PENDING') return { status: 'PENDING', requestId: r.id };
  }

  const id = crypto.randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO FriendRequest (id, senderId, receiverId, status, createdAt, updatedAt)
     VALUES (?, ?, ?, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(senderId, receiverId) DO UPDATE SET status = 'PENDING', updatedAt = CURRENT_TIMESTAMP`,
    id,
    senderId,
    receiverId
  );

  await notify(receiverId, 'New Message Request', `${sender.fullName} wants to connect with you on the network.`);

  return { status: 'PENDING', requestId: id };
}

/**
 * Respond to a friend/message request (ACCEPT or REJECT)
 */
export async function respondDmRequest(requestId: string, userId: string, action: 'ACCEPT' | 'REJECT') {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT r.*, s.fullName as senderName, s.id as senderId, rec.fullName as receiverName
     FROM FriendRequest r
     JOIN User s ON r.senderId = s.id
     JOIN User rec ON r.receiverId = rec.id
     WHERE r.id = ? LIMIT 1`,
    requestId
  );

  if (rows.length === 0) throw new HttpError(404, 'Request not found');
  const req = rows[0];

  if (req.receiverId !== userId) {
    throw new HttpError(403, 'You are not authorized to respond to this request.');
  }

  const newStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
  await prisma.$executeRawUnsafe(
    `UPDATE FriendRequest SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
    newStatus,
    requestId
  );

  if (action === 'ACCEPT') {
    await notify(
      req.senderId,
      'Message Request Accepted!',
      `${req.receiverName} accepted your request. You can now chat freely.`
    );
  }

  return { ok: true, status: newStatus };
}

/**
 * List pending requests for a user (both incoming and outgoing)
 */
export async function listUserRequests(userId: string) {
  const incoming = await prisma.$queryRawUnsafe<any[]>(
    `SELECT r.*, s.fullName, s.tier, s.badge, s.role
     FROM FriendRequest r
     JOIN User s ON r.senderId = s.id
     WHERE r.receiverId = ? AND r.status = 'PENDING'
     ORDER BY r.createdAt DESC`,
    userId
  );

  const outgoing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT r.*, rec.fullName, rec.tier, rec.badge, rec.role
     FROM FriendRequest r
     JOIN User rec ON r.receiverId = rec.id
     WHERE r.senderId = ? AND r.status = 'PENDING'
     ORDER BY r.createdAt DESC`,
    userId
  );

  const accepted = await prisma.$queryRawUnsafe<any[]>(
    `SELECT r.*,
            CASE WHEN r.senderId = ? THEN rec.id ELSE s.id END as friendId,
            CASE WHEN r.senderId = ? THEN rec.fullName ELSE s.fullName END as friendName,
            CASE WHEN r.senderId = ? THEN rec.tier ELSE s.tier END as friendTier,
            CASE WHEN r.senderId = ? THEN rec.badge ELSE s.badge END as friendBadge,
            CASE WHEN r.senderId = ? THEN rec.role ELSE s.role END as friendRole
     FROM FriendRequest r
     JOIN User s ON r.senderId = s.id
     JOIN User rec ON r.receiverId = rec.id
     WHERE (r.senderId = ? OR r.receiverId = ?) AND r.status = 'ACCEPTED'
     ORDER BY r.updatedAt DESC`,
    userId,
    userId,
    userId,
    userId,
    userId,
    userId,
    userId
  );

  return { incoming, outgoing, accepted };
}
