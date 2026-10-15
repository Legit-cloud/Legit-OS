import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Building2, GraduationCap, CalendarDays, Bike, Wallet, Users, UserCircle2, LogOut, Flame, Trophy, ShieldCheck, X, Bell,
} from 'lucide-react';
import { Shell, NotificationBell, type NavItem } from '../../components/Shell';
import { Avatar, Badge, Button } from '../../components/ui';
import { useLogout, useSessionSync } from '../../components/session';
import { BroadcastReceiver } from '../../components/BroadcastReceiver';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../store/auth';
import { tierLabel } from '../../lib/format';
import type { Notification } from '../../lib/types';

function ProfileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuth((s) => s.user)!;
  const logout = useLogout();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-slate-950/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            className="fixed right-4 top-20 z-50 flex h-fit max-h-[calc(100vh-6rem)] w-[min(360px,calc(100vw-2rem))] flex-col overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-2xl dark:border-white/10 dark:bg-[#05070d]"
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-400">Command Center VIP</p>
              <button onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Close profile"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <Avatar name={user.fullName} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-bold">{user.fullName}</p>
                <p className="truncate text-sm text-slate-500">{user.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <Badge tone="cyan">{tierLabel(user.tier)}</Badge>
                  {user.verified && <Badge tone="green"><ShieldCheck className="h-3 w-3" /> Verified</Badge>}
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900"><Trophy className="h-5 w-5 text-amber-500" /><p className="mt-2 font-display text-2xl font-bold">{user.points}</p><p className="text-xs text-slate-500">Hub points</p></div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900"><Flame className="h-5 w-5 text-orange-500" /><p className="mt-2 font-display text-2xl font-bold">{user.streakDays}d</p><p className="text-xs text-slate-500">Active streak</p></div>
            </div>
            <div className="mt-6 space-y-2">
              <Link to="/app/profile" onClick={onClose}><Button variant="outline" className="w-full">View full profile</Button></Link>
            </div>
            <Button variant="danger" className="mt-auto w-full" onClick={() => logout()}><LogOut className="h-4 w-4" /> Sign out</Button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default function AppLayout() {
  useSessionSync();
  const user = useAuth((s) => s.user)!;
  const [drawer, setDrawer] = useState(false);

  const notifQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ items: Notification[]; unread: number }>('/notifications'),
    refetchInterval: 15_000,
  });

  const unreadCount = notifQuery.data?.unread ?? 0;

  const nav: NavItem[] = [
    { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/app/infra', label: 'Infra', icon: Building2 },
    { to: '/app/academy', label: 'Academy', icon: GraduationCap },
    { to: '/app/events', label: 'Events & Sync', icon: CalendarDays },
    { to: '/app/transit', label: 'Transit Hub', icon: Bike, soon: true },
    { to: '/app/finance', label: 'Finance & Logs', icon: Wallet },
    { to: '/app/network', label: 'Network', icon: Users },
    { to: '/app/notifications', label: 'Notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
    { to: '/app/profile', label: 'Profile', icon: UserCircle2 },
  ];

  return (
    <Shell
      nav={nav}
      title="L.E.G.I.T OS"
      topRight={
        <>
          <NotificationBell />
          <button onClick={() => setDrawer(true)} className="ml-1 flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-slate-200/60 dark:hover:bg-white/10" aria-label="Open profile">
            <Avatar name={user.fullName} size="sm" />
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-tight">{user.fullName.split(' ')[0]}</span>
              <span className="block text-[11px] leading-tight text-slate-500">{tierLabel(user.tier)}</span>
            </span>
          </button>
        </>
      }
    >
      <BroadcastReceiver />
      <ProfileDrawer open={drawer} onClose={() => setDrawer(false)} />
      <Outlet />
    </Shell>
  );
}
