import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Menu, X, ArrowRight, PanelLeftClose, PanelLeftOpen, Volume2, VolumeX, Play, type LucideIcon } from 'lucide-react';
import { api } from '../lib/api';
import { timeAgo } from '../lib/format';
import type { Notification } from '../lib/types';
import { Logo, cn } from './ui';
import {
  isSoundEnabled,
  toggleSound,
  playChime,
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
  showDesktopNotification,
} from '../lib/soundAndNotification';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
  badgeTone?: 'cyan' | 'amber' | 'rose' | 'emerald';
  section?: string;
  soon?: boolean;
}

/** Sidebar + top status bar layout shared by the client terminal and the admin portal. */
export function Shell({ nav, title, topRight, footer, children }: { nav: NavItem[]; title: string; topRight: ReactNode; footer?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'flex items-center px-5 py-4 border-b border-slate-200/60 dark:border-white/10',
          collapsed ? 'flex-col gap-2.5 px-2 py-4 justify-center' : 'justify-between'
        )}
      >
        <Logo compact={collapsed} />

        {/* Desktop Collapse Button - placed INSIDE the side panel */}
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="hidden rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:flex dark:hover:bg-white/10 dark:hover:text-slate-200"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        )}

        {/* Mobile Close Button - placed INSIDE the mobile side panel header */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden dark:hover:bg-white/10 dark:hover:text-slate-200"
          title="Close sidebar"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Desktop Expand Button when collapsed - inside the side panel */}
        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="hidden rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-cyan-600 lg:flex dark:hover:bg-white/10 dark:hover:text-cyan-400"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}
      </div>

      {!collapsed && <p className="px-6 pt-3 pb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400">{title}</p>}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 scrollbar-thin">
        {nav.map((n) => (
          <div key={n.to}>
            {n.section && !collapsed && (
              <p className="mt-4 mb-1.5 px-3 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {n.section}
              </p>
            )}
            <NavLink
              to={n.to}
              end={n.end}
              title={collapsed ? `${n.label}${n.badge && n.badge > 0 ? ` (${n.badge} unattended)` : ''}` : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-2xl py-2.5 text-sm font-medium transition',
                  collapsed ? 'justify-center px-0 w-10 mx-auto' : 'px-3.5',
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 to-blue-600/10 text-cyan-700 ring-1 ring-cyan-500/30 dark:text-cyan-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5',
                )
              }
            >
              <div className="relative shrink-0">
                <n.icon className="h-[18px] w-[18px]" />
                {!!n.badge && n.badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span
                      className={cn(
                        'absolute inline-flex h-full w-full animate-ping rounded-full opacity-80',
                        n.badgeTone === 'rose'
                          ? 'bg-rose-500'
                          : n.badgeTone === 'amber'
                          ? 'bg-amber-400'
                          : 'bg-cyan-400'
                      )}
                    />
                    <span
                      className={cn(
                        'relative inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900',
                        n.badgeTone === 'rose'
                          ? 'bg-rose-500'
                          : n.badgeTone === 'amber'
                          ? 'bg-amber-500'
                          : 'bg-cyan-500'
                      )}
                    />
                  </span>
                )}
              </div>
              {!collapsed && <span className="flex-1 truncate">{n.label}</span>}
              {!collapsed && n.soon && !n.badge && (
                <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  Soon
                </span>
              )}
              {!collapsed && !!n.badge && n.badge > 0 && (
                <span
                  className={cn(
                    'ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide text-white shadow-md',
                    n.badgeTone === 'rose'
                      ? 'bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 shadow-rose-500/40 ring-1 ring-white/20'
                      : n.badgeTone === 'amber'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/30 ring-1 ring-white/20'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-cyan-500/30'
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  <span>{n.badge}</span>
                </span>
              )}
            </NavLink>
          </div>
        ))}
      </nav>
      {footer && !collapsed && <div className="border-t border-slate-200 p-3 dark:border-white/10">{footer}</div>}
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white/70 backdrop-blur-xl lg:block transition-all duration-300 dark:border-white/10 dark:bg-slate-950/60', collapsed ? 'w-20' : 'w-64')}>
        {sidebar}
      </aside>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white lg:hidden dark:bg-slate-950"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className={cn('transition-all duration-300', collapsed ? 'lg:pl-20' : 'lg:pl-64')}>
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 backdrop-blur-xl sm:px-6 dark:border-white/10 dark:bg-[#05070d]/80">
          <button className="rounded-full p-2 text-slate-600 hover:bg-slate-200/60 lg:hidden dark:text-slate-300 dark:hover:bg-white/10" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <span className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-emerald-700 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            SYSTEM ONLINE
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {topRight}
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [desktopPerm, setDesktopPerm] = useState(() => getDesktopNotificationPermission());
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: () => api<{ items: Notification[]; unread: number }>('/notifications') });
  const readAll = useMutation({
    mutationFn: () => api('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleToggleSound = () => {
    const next = toggleSound();
    setSoundOn(next);
    if (next) playChime('pop');
  };

  const handleRequestDesktop = async () => {
    const granted = await requestDesktopNotificationPermission();
    setDesktopPerm(getDesktopNotificationPermission());
    if (granted) {
      showDesktopNotification('L.E.G.I.T Innovation Hub', 'Desktop notifications enabled!');
    }
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = () => {
    setOpen(!open);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative rounded-full p-2 text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-white/10" aria-label="Notifications">
        <Bell className="h-[18px] w-[18px]" />
        {!!data?.unread && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-cyan-500 px-1 text-[10px] font-bold text-white shadow-md shadow-cyan-500/40 ring-2 ring-white dark:ring-slate-950 animate-pulse">
            {data.unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="glass absolute right-0 top-12 z-40 w-[min(360px,calc(100vw-2rem))] bg-white/95 p-2 shadow-xl dark:bg-slate-900/95"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notifications</p>
                <button
                  type="button"
                  onClick={handleToggleSound}
                  title={soundOn ? 'Audio chime enabled (Click to mute)' : 'Audio chime muted (Click to enable)'}
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-cyan-600 dark:hover:bg-white/10 dark:hover:text-cyan-400"
                >
                  {soundOn ? <Volume2 className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" /> : <VolumeX className="h-3.5 w-3.5 text-slate-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => playChime('chime')}
                  title="Test audio chime"
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-cyan-600 dark:hover:bg-white/10 dark:hover:text-cyan-400"
                >
                  <Play className="h-3 w-3" />
                </button>
              </div>
              {!!data?.unread && (
                <button
                  onClick={() => readAll.mutate()}
                  disabled={readAll.isPending}
                  className="text-[11px] font-semibold text-cyan-600 hover:underline dark:text-cyan-400"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Desktop Notification Prompt */}
            {desktopPerm === 'default' && (
              <div className="mx-2 mt-2 flex items-center justify-between rounded-xl bg-cyan-500/10 px-2.5 py-1.5 text-xs text-cyan-700 dark:text-cyan-300">
                <span>Enable desktop push alerts?</span>
                <button
                  type="button"
                  onClick={handleRequestDesktop}
                  className="rounded-lg bg-cyan-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow hover:bg-cyan-600"
                >
                  Enable
                </button>
              </div>
            )}
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {data?.items.length ? (
                data.items.map((n) => (
                  <div key={n.id} className={cn('rounded-2xl px-3 py-2.5', !n.read && 'bg-cyan-500/5')}>
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{n.body}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
                  </div>
                ))
              ) : (
                <p className="px-3 py-6 text-center text-sm text-slate-500">You're all caught up.</p>
              )}
            </div>
            <div className="mt-2 border-t border-slate-200/60 pt-2 dark:border-white/10">
              <Link
                to="/app/notifications"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-cyan-600 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-white/5"
              >
                <span>View all in Notifications Page</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
