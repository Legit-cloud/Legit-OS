import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, ListChecks, Boxes, Bike, CalendarDays, Users, Handshake, BookOpenCheck, MessagesSquare, Activity, LogOut, Laptop, GraduationCap,
  X, Trophy, Flame, ShieldCheck, Megaphone
} from 'lucide-react';
import { Shell, NotificationBell, type NavItem } from '../../components/Shell';
import { Avatar, Badge, Button } from '../../components/ui';
import { useLogout, useSessionSync } from '../../components/session';
import { BroadcastReceiver } from '../../components/BroadcastReceiver';
import { api } from '../../lib/api';
import { useSocketEvent } from '../../lib/socket';
import { useAuth } from '../../store/auth';
import { playChime } from '../../lib/soundAndNotification';
import type { AdminOverviewData } from './AdminOverview';

function AdminProfileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuth((s) => s.user)!;
  const logout = useLogout();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            className="fixed right-4 top-20 z-50 flex h-fit max-h-[calc(100vh-6rem)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-y-auto rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-cyan-500/20 dark:bg-[#07090e]/95 dark:shadow-cyan-950/40"
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">Admin Command Center</p>
              </div>
              <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Close profile"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 flex items-center gap-4">
              <Avatar name={user.fullName} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-bold text-slate-900 dark:text-white">{user.fullName}</p>
                <p className="truncate font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">@{user.username || 'admin'}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="blue">ADMINISTRATOR</Badge>
                  <Badge tone="green"><ShieldCheck className="h-3 w-3" /> Full Privileges</Badge>
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2 text-amber-500">
                  <Trophy className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Points</span>
                </div>
                <p className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-white">{user.points}</p>
                <p className="text-[11px] text-slate-500">Hub points</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2 text-orange-500">
                  <Flame className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Streak</span>
                </div>
                <p className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-white">{user.streakDays}d</p>
                <p className="text-[11px] text-slate-500">Active streak</p>
              </div>
            </div>
            <Button variant="danger" className="mt-6 w-full" onClick={() => logout()}><LogOut className="h-4 w-4" /> Sign out</Button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default function AdminLayout() {
  useSessionSync();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user)!;
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);

  // If visiting another admin's URL slug, smoothly sync to current admin's own handle
  useEffect(() => {
    if (user?.username && username && username !== user.username) {
      const corrected = location.pathname.replace(`/admin/${username}`, `/admin/${user.username}`);
      navigate(corrected, { replace: true });
    }
  }, [username, user?.username, location.pathname, navigate]);

  const overview = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => api<AdminOverviewData>('/admin/overview'),
    refetchInterval: 6_000,
  });

  // Any queue/dispatch change elsewhere refreshes the admin views that show it.
  useSocketEvent('queue:changed', () => {
    qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
    qc.invalidateQueries({ queryKey: ['admin', 'queue'] });
    playChime('chime');
  });
  useSocketEvent('transit:changed', () => {
    qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
    qc.invalidateQueries({ queryKey: ['admin', 'riders'] });
  });
  useSocketEvent('support:activity', () => qc.invalidateQueries({ queryKey: ['admin', 'threads'] }));

  const base = `/admin/${user?.username || 'admin'}`;

  const nav: NavItem[] = [
    // ── Management & Control ──
    { to: base, label: 'Overview', icon: LayoutDashboard, end: true, section: 'Admin Operations' },
    { to: `${base}/queue`, label: 'Action Queue', icon: ListChecks, badge: overview.data?.pendingQueue, badgeTone: 'rose' },
    { to: `${base}/hardware`, label: 'Hardware Rentals', icon: Laptop },
    { to: `${base}/assets`, label: 'Hub Assets & Pricing', icon: Boxes },
    { to: `${base}/courses`, label: 'Academy Courses', icon: GraduationCap },
    { to: `${base}/riders`, label: 'Hub Riders', icon: Bike, badge: overview.data?.pendingRides, badgeTone: 'amber' },
    { to: `${base}/events`, label: 'Events & Games', icon: CalendarDays },
    { to: `${base}/users`, label: 'User Directory', icon: Users },
    { to: `${base}/broadcast`, label: 'Broadcasts & Alerts', icon: Megaphone },
    { to: `${base}/partners`, label: 'Partner Network', icon: Handshake },
    { to: `${base}/ledger`, label: 'Global Ledger', icon: BookOpenCheck },
    { to: `${base}/comms`, label: 'Comms', icon: MessagesSquare },
    { to: `${base}/telemetry`, label: 'Device Telemetry', icon: Activity },
  ];

  return (
    <Shell
      nav={nav}
      title="Admin Command Center"
      topRight={
        <>
          <NotificationBell />
          <button
            onClick={() => setDrawer(true)}
            className="ml-1 flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-slate-200/60 dark:hover:bg-white/10"
            aria-label="Open profile"
          >
            <Avatar name={user.fullName} size="sm" />
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-tight">{user.fullName.split(' ')[0]}</span>
              <span className="block text-[11px] leading-tight text-blue-600 dark:text-blue-400 font-bold font-mono">@{user.username || 'admin'}</span>
            </span>
          </button>
        </>
      }
    >
      <BroadcastReceiver />
      <AdminProfileDrawer open={drawer} onClose={() => setDrawer(false)} />
      <Outlet />
    </Shell>
  );
}


