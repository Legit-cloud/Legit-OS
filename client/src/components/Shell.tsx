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
  /** Pin to the mobile bottom tab bar (falls back to the first four items). */
  primary?: boolean;
}

/** Sidebar + top status bar layout shared by the client terminal and the admin portal. */
export function Shell({ nav, title, topRight, footer, children }: { nav: NavItem[]; title: string; topRight: ReactNode; footer?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('legit_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    try {
      localStorage.setItem('legit_sidebar_collapsed', collapsed ? '1' : '0');
    } catch {}
  }, [collapsed]);

  // Lock page scroll behind the mobile drawer and let Escape dismiss it
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Current page label (longest matching route) for the mobile header
  const current = [...nav]
    .filter((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))
    .sort((a, b) => b.to.length - a.to.length)[0];
  const tabs = (nav.some((n) => n.primary) ? nav.filter((n) => n.primary) : nav.filter((n) => !n.soon).slice(0, 4)).slice(0, 4);
  const moreActive = !!current && !tabs.includes(current);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'flex items-center px-5 py-4 border-b border-slate-200/60',
          collapsed ? 'flex-col gap-2.5 px-2 py-4 justify-center' : 'justify-between'
        )}
      >
        <Logo compact={collapsed} />

        {/* Desktop Collapse Button - placed INSIDE the side panel */}
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="hidden rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:flex"
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
          className="flex rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
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
            className="hidden rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-cyan-600 lg:flex"
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
                  'flex items-center gap-3 rounded-2xl py-2.5 text-sm font-medium transition-all duration-200',
                  collapsed ? 'justify-center px-0 w-10 mx-auto' : 'px-3.5',
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-500/30 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              <div className="relative shrink-0">
                <n.icon className="h-[18px] w-[18px]" />
                {!!n.badge && n.badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-80" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#155dfd] ring-2 ring-white" />
                  </span>
                )}
              </div>
              {!collapsed && <span className="flex-1 truncate">{n.label}</span>}
              {!collapsed && n.soon && !n.badge && (
                <span className="ml-auto rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-[#155dfd]">
                  Soon
                </span>
              )}
              {!collapsed && !!n.badge && n.badge > 0 && (
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#155dfd] px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide text-white shadow-md shadow-blue-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  <span>{n.badge}</span>
                </span>
              )}
            </NavLink>
          </div>
        ))}
      </nav>
      {footer && !collapsed && <div className="border-t border-slate-200 p-3">{footer}</div>}
    </div>
  );

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 transition-colors duration-200">
      <a
        href="#main"
        className="sr-only z-[70] rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200/80 bg-white/90 backdrop-blur-2xl lg:block transition-all duration-300', collapsed ? 'w-20' : 'w-64')}>
        {sidebar}
      </aside>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white/95 border-r border-slate-200 backdrop-blur-2xl lg:hidden"
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
        <header className="safe-top sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200/80 bg-white/80 px-3 py-2.5 backdrop-blur-xl sm:gap-3 sm:px-6 sm:py-3">
          <button className="tap rounded-full p-2 text-slate-600 hover:bg-slate-200/60 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          {current && (
            <p className="min-w-0 truncate font-display text-base font-bold tracking-tight lg:hidden" aria-live="polite">
              {current.label}
            </p>
          )}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {topRight}
          </div>
        </header>
        <main id="main" className="mx-auto max-w-7xl px-4 py-5 pb-28 sm:px-6 sm:py-6 lg:py-8 lg:pb-8">{children}</main>
      </div>

      {/* Mobile bottom tab bar: thumb-reachable primary navigation */}
      <nav
        aria-label="Primary"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/90 backdrop-blur-2xl lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1">
          {tabs.map((n) => (
            <li key={n.to} className="flex-1">
              <NavLink
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    'tap relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[11px] font-semibold transition-colors',
                    isActive ? 'text-blue-600' : 'text-slate-500',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'relative grid h-7 w-12 place-items-center rounded-full transition-colors',
                        isActive && 'bg-blue-50',
                      )}
                    >
                      <n.icon className="h-[20px] w-[20px]" />
                      {!!n.badge && n.badge > 0 && (
                        <span className="absolute right-1.5 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-[#155dfd] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                          {n.badge > 99 ? '99+' : n.badge}
                        </span>
                      )}
                    </span>
                    <span className="max-w-full truncate">{n.label.split(' ')[0]}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="More navigation"
              className={cn(
                'tap flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[11px] font-semibold transition-colors',
                moreActive ? 'text-blue-600' : 'text-slate-500',
              )}
            >
              <span className={cn('grid h-7 w-12 place-items-center rounded-full', moreActive && 'bg-blue-50')}>
                <Menu className="h-[20px] w-[20px]" />
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>
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
      <button onClick={toggle} className="relative rounded-full p-2 text-slate-600 hover:bg-slate-200/60" aria-label="Notifications">
        <Bell className="h-[18px] w-[18px]" />
        {!!data?.unread && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#155dfd] px-1 text-[10px] font-bold text-white shadow-md shadow-blue-500/40 ring-2 ring-white animate-pulse">
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
            className="glass fixed left-3 right-3 top-16 z-50 max-w-sm mx-auto sm:absolute sm:inset-auto sm:right-0 sm:top-12 sm:w-[360px] sm:max-w-none sm:mx-0 bg-white/95 p-2 shadow-2xl"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notifications</p>
                <button
                  type="button"
                  onClick={handleToggleSound}
                  title={soundOn ? 'Audio chime enabled (Click to mute)' : 'Audio chime muted (Click to enable)'}
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-[#155dfd]"
                >
                  {soundOn ? <Volume2 className="h-3.5 w-3.5 text-[#155dfd]" /> : <VolumeX className="h-3.5 w-3.5 text-slate-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => playChime('chime')}
                  title="Test audio chime"
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-[#155dfd]"
                >
                  <Play className="h-3 w-3" />
                </button>
              </div>
              {!!data?.unread && (
                <button
                  onClick={() => readAll.mutate()}
                  disabled={readAll.isPending}
                  className="text-[11px] font-semibold text-[#155dfd] hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Desktop Notification Prompt */}
            {desktopPerm === 'default' && (
              <div className="mx-2 mt-2 flex items-center justify-between rounded-xl bg-blue-500/10 px-2.5 py-1.5 text-xs text-blue-700">
                <span>Enable desktop push alerts?</span>
                <button
                  type="button"
                  onClick={handleRequestDesktop}
                  className="rounded-lg bg-[#155dfd] px-2 py-0.5 text-[11px] font-semibold text-white shadow hover:bg-blue-700"
                >
                  Enable
                </button>
              </div>
            )}
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {data?.items.length ? (
                data.items.map((n) => (
                  <div key={n.id} className={cn('rounded-2xl px-3 py-2.5', !n.read && 'bg-blue-500/5')}>
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="text-sm text-slate-500">{n.body}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
                  </div>
                ))
              ) : (
                <p className="px-3 py-6 text-center text-sm text-slate-500">You're all caught up.</p>
              )}
            </div>
            <div className="mt-2 border-t border-slate-200/60 pt-2">
              <Link
                to="/app/notifications"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-[#155dfd] hover:bg-blue-50"
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
