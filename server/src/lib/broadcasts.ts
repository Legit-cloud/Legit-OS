import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type BroadcastType = 'POPUP' | 'NOTIFICATION' | 'BANNER' | 'COMBO';
export type BroadcastSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'URGENT';
export type BroadcastTarget = 'ALL' | 'TIER' | 'USER';

export interface BroadcastEntry {
  id: string;
  type: BroadcastType;
  title: string;
  body: string;
  target: BroadcastTarget;
  targetUserId?: string;
  targetUserName?: string;
  tier?: string;
  severity: BroadcastSeverity;
  actionUrl?: string;
  actionLabel?: string;
  senderId: string;
  senderName: string;
  deliveredCount: number;
  createdAt: string;
  acknowledgedUsers?: string[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_FILE = path.resolve(__dirname, '../../../server/uploads/broadcasts.json');

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let broadcastsCache: BroadcastEntry[] | null = null;

function loadBroadcasts(): BroadcastEntry[] {
  if (broadcastsCache !== null) return broadcastsCache;
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
      broadcastsCache = JSON.parse(data);
      return broadcastsCache || [];
    }
  } catch (err) {
    console.error('Failed to read broadcasts.json', err);
  }
  broadcastsCache = [];
  return broadcastsCache;
}

function persistBroadcasts(list: BroadcastEntry[]) {
  try {
    ensureDir(STORAGE_FILE);
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(list, null, 2), 'utf-8');
    broadcastsCache = list;
  } catch (err) {
    console.error('Failed to save broadcasts.json', err);
  }
}

export function saveBroadcast(entry: BroadcastEntry) {
  const list = loadBroadcasts();
  if (!entry.acknowledgedUsers) {
    entry.acknowledgedUsers = [];
  }
  // Prepend newest first
  list.unshift(entry);
  // Keep up to 200 past broadcasts
  if (list.length > 200) list.length = 200;
  persistBroadcasts(list);
}

export function getBroadcastHistory(): BroadcastEntry[] {
  return [...loadBroadcasts()];
}

/**
 * Returns any active popups or banners targeting this user that they have NOT yet acknowledged.
 * Checks up to 14 days back so users who were offline for days still get the popup!
 */
export function getActiveBroadcastsForUser(userId: string, tier: string): BroadcastEntry[] {
  const list = loadBroadcasts();
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000; // active within last 14 days
  return list.filter((b) => {
    const isRecent = new Date(b.createdAt).getTime() >= cutoff;
    if (!isRecent) return false;
    // Only popups and banners need interactive acknowledgment
    if (b.type !== 'POPUP' && b.type !== 'BANNER' && b.type !== 'COMBO') return false;

    // Audience check
    const isTargeted =
      b.target === 'ALL' ||
      (b.target === 'TIER' && b.tier === tier) ||
      (b.target === 'USER' && b.targetUserId === userId);
    if (!isTargeted) return false;

    // Has user already acknowledged this broadcast?
    const acknowledged = Array.isArray(b.acknowledgedUsers) && b.acknowledgedUsers.includes(userId);
    return !acknowledged;
  });
}

/**
 * Returns all past and present broadcasts that targeted this user.
 */
export function getAllBroadcastsForUser(userId: string, tier: string): BroadcastEntry[] {
  const list = loadBroadcasts();
  return list.filter((b) => {
    if (b.target === 'ALL') return true;
    if (b.target === 'TIER' && b.tier === tier) return true;
    if (b.target === 'USER' && b.targetUserId === userId) return true;
    return false;
  });
}

/**
 * Marks a broadcast as acknowledged by a specific user.
 */
export function acknowledgeBroadcast(broadcastId: string, userId: string): boolean {
  const list = loadBroadcasts();
  const entry = list.find((b) => b.id === broadcastId);
  if (!entry) return false;
  if (!entry.acknowledgedUsers) entry.acknowledgedUsers = [];
  if (!entry.acknowledgedUsers.includes(userId)) {
    entry.acknowledgedUsers.push(userId);
    persistBroadcasts(list);
  }
  return true;
}

/**
 * Deletes a broadcast from persistent storage (admin recall/delete).
 */
export function deleteBroadcast(id: string): BroadcastEntry | null {
  const list = loadBroadcasts();
  const idx = list.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  const [removed] = list.splice(idx, 1);
  persistBroadcasts(list);
  return removed;
}
