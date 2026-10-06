import type { Tier } from './types';

export const TZ = 'Africa/Lagos';

export const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

export const tierLabel = (t: Tier) =>
  ({ PAY_AS_YOU_GO: 'Pay-As-You-Go', PRO_MONTHLY: 'Pro Monthly', VIP: 'VIP' })[t];

export const formatDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString('en-NG', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });

export const formatDateTime = (iso: string | Date) =>
  new Date(iso).toLocaleString('en-NG', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const formatTime = (iso: string | Date) =>
  new Date(iso).toLocaleTimeString('en-NG', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

export function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export const humanize = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
