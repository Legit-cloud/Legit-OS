import type { User } from '@prisma/client';
import { HttpError } from './http.js';

export const GLOBAL_CHANNEL = 'Global Community';

/**
 * Maps a client-facing channel key to the stored channel name, strictly enforcing Row-Level Security:
 *  - "global"         -> the open community room
 *  - "support"        -> the caller's private thread with hub admins
 *  - "support:<id>"   -> any member's support thread (admins only)
 *  - "dm:<otherId>"   -> 1-on-1 private direct message channel between caller and otherId
 *  - "dm:<id1>:<id2>" -> canonical 1-on-1 private channel between id1 and id2 (caller must be id1 or id2)
 */
export function resolveChannel(user: User, requested: unknown): string {
  if (requested === 'global' || requested === GLOBAL_CHANNEL) return GLOBAL_CHANNEL;
  if (requested === 'support') return `support:${user.id}`;
  if (typeof requested === 'string' && requested.startsWith('support:')) {
    if (user.role === 'ADMIN' || requested === `support:${user.id}`) return requested;
  }

  // Direct 1-on-1 member messages (e.g. dm:<otherId> or dm:<id1>:<id2>)
  if (typeof requested === 'string' && requested.startsWith('dm:')) {
    const raw = requested.slice('dm:'.length).trim();
    const parts = raw.split(':').filter(Boolean);

    if (parts.length === 1) {
      const otherId = parts[0];
      if (otherId === user.id) {
        throw new HttpError(400, 'Cannot open direct message with yourself');
      }
      // Canonical deterministic sorted channel identifier
      return `dm:${[user.id, otherId].sort().join(':')}`;
    }

    if (parts.length === 2) {
      const [id1, id2] = parts;
      // Row-Level Security: Calling user MUST be one of the two participants
      if (user.id !== id1 && user.id !== id2) {
        throw new HttpError(403, 'Forbidden: You are not authorized to access this private conversation');
      }
      return `dm:${[id1, id2].sort().join(':')}`;
    }
  }

  throw new HttpError(403, 'You cannot access this channel');
}

export const supportOwner = (channel: string) =>
  channel.startsWith('support:') ? channel.slice('support:'.length) : null;

export const isDmChannel = (channel: string) => channel.startsWith('dm:');

export function getDmRecipientId(channel: string, currentUserId: string): string | null {
  if (!channel.startsWith('dm:')) return null;
  const parts = channel.slice('dm:'.length).split(':');
  if (parts.length !== 2) return null;
  return parts[0] === currentUserId ? parts[1] : parts[0];
}
