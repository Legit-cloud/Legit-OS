import type { Server } from 'socket.io';
import { prisma } from './prisma.js';

let io: Server | undefined;
export const online = new Map<string, number>(); // userId -> open socket count

export function setIo(server: Server) {
  io = server;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToAdmins(event: string, payload: unknown) {
  io?.to('admins').emit(event, payload);
}

export function emitToChannel(channel: string, event: string, payload: unknown) {
  io?.to(`chan:${channel}`).emit(event, payload);
}

export function emitAll(event: string, payload?: unknown) {
  io?.emit(event, payload);
}

/** Kicks every live socket of a user (used when an account is suspended or banned). */
export function disconnectUser(userId: string) {
  io?.to(`user:${userId}`).emit('force-logout');
  io?.in(`user:${userId}`).disconnectSockets(true);
}

export function socketCount() {
  return io?.engine.clientsCount ?? 0;
}

export async function notify(userId: string, title: string, body: string) {
  const n = await prisma.notification.create({ data: { userId, title, body } });
  emitToUser(userId, 'notification', n);
  return n;
}

export async function notifyAdmins(title: string, body: string) {
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  const records = await Promise.all(
    admins.map(async (a) => {
      const n = await prisma.notification.create({ data: { userId: a.id, title, body } });
      emitToUser(a.id, 'notification', n);
      return n;
    })
  );
  emitToAdmins('admin:notification', { title, body });
  return records;
}
