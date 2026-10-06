import type { User } from '@prisma/client';
import { HttpError } from './http.js';

export const GLOBAL_CHANNEL = 'Global Community';

/**
 * Maps a client-facing channel key to the stored channel name, enforcing access:
 *  - "global"         -> the open community room
 *  - "support"        -> the caller's private thread with hub admins
 *  - "support:<id>"   -> any member's support thread (admins only)
 */
export function resolveChannel(user: User, requested: unknown): string {
  if (requested === 'global' || requested === GLOBAL_CHANNEL) return GLOBAL_CHANNEL;
  if (requested === 'support') return `support:${user.id}`;
  if (typeof requested === 'string' && requested.startsWith('support:')) {
    if (user.role === 'ADMIN' || requested === `support:${user.id}`) return requested;
  }
  throw new HttpError(403, 'You cannot access this channel');
}

export const supportOwner = (channel: string) =>
  channel.startsWith('support:') ? channel.slice('support:'.length) : null;
