import { Link, Outlet } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, ListChecks, Boxes, Bike, CalendarDays, Users, Handshake, BookOpenCheck, MessagesSquare, Activity, LogOut, MonitorSmartphone,
} from 'lucide-react';
import { Shell, type NavItem } from '../../components/Shell';
import { Avatar, Button } from '../../components/ui';
import { useLogout, useSessionSync } from '../../components/session';
import { api } from '../../lib/api';
import { useSocketEvent } from '../../lib/socket';
import { useAuth } from '../../store/auth';
import type { AdminOverviewData } from './AdminOverview';

export default function AdminLayout() {
  useSessionSync();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user)!;
  const logout = useLogout();
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: () => api<AdminOverviewData>('/admin/overview') });

  // Any queue/dispatch change elsewhere refreshes the admin views that show it.
  useSocketEvent('queue:changed', () => {
    qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
    qc.invalidateQueries({ queryKey: ['admin', 'queue'] });
  });
  useSocketEvent('transit:changed', () => {
    qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
    qc.invalidateQueries({ queryKey: ['admin', 'riders'] });
  });
  useSocketEvent('support:activity', () => qc.invalidateQueries({ queryKey: ['admin', 'threads'] }));

  const nav: NavItem[] = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/queue', label: 'Action Queue', icon: ListChecks, badge: overview.data?.pendingQueue },
    { to: '/admin/assets', label: 'Hub Assets', icon: Boxes },
    { to: '/admin/riders', label: 'Hub Riders', icon: Bike, badge: overview.data?.pendingRides },
    { to: '/admin/events', label: 'Events & Games', icon: CalendarDays },
    { to: '/admin/users', label: 'User Directory', icon: Users },
    { to: '/admin/partners', label: 'Partner Network', icon: Handshake },
    { to: '/admin/ledger', label: 'Global Ledger', icon: BookOpenCheck },
    { to: '/admin/comms', label: 'Comms', icon: MessagesSquare },
    { to: '/admin/telemetry', label: 'Rental Laptops', icon: Activity },
  ];

  return (
    <Shell
      nav={nav}
      title="Admin Command Center"
      footer={
        <Link to="/app" className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">
          <MonitorSmartphone className="h-4 w-4" /> Switch to member terminal
        </Link>
      }
      topRight={
        <>
          <span className="ml-1 hidden items-center gap-2 sm:flex">
            <Avatar name={user.fullName} size="sm" />
            <span className="text-sm font-semibold">{user.fullName}</span>
          </span>
          <Button size="sm" variant="ghost" onClick={() => logout()} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button>
        </>
      }
    >
      <Outlet />
    </Shell>
  );
}
