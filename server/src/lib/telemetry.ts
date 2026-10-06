import { prisma } from './prisma.js';
import { emitToAdmins } from './realtime.js';

export type LogLevel = 'INFO' | 'WARN' | 'SECURITY' | 'ADMIN';

export async function log(level: LogLevel, message: string, actorId?: string) {
  const entry = await prisma.telemetryLog.create({ data: { level, message, actorId } });
  emitToAdmins('telemetry', entry);
  return entry;
}
