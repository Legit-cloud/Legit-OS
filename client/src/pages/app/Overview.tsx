import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Clock, Flame, GraduationCap, Receipt, Timer, Trophy, Building2, Bike, Users } from 'lucide-react';
import { Badge, Button, Card, PageHeader, StatCard } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { TZ, naira } from '../../lib/format';
import type { Booking, Course, Invoice, Notification } from '../../lib/types';
import { useAuth } from '../../store/auth';
import { toast } from '../../store/toast';

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// Approximate positions on a 0–100 grid derived from lat/long within Nigeria's bounds.
const CITIES = [
  { name: 'Ibadan', x: 18, y: 72, hub: true },
  { name: 'Lagos', x: 12, y: 82 },
  { name: 'Abuja', x: 48, y: 52 },
  { name: 'Kano', x: 55, y: 18 },
  { name: 'Port Harcourt', x: 44, y: 92 },
  { name: 'Enugu', x: 50, y: 78 },
];

function TimeSync() {
  const now = useNow();
  const time = now.toLocaleTimeString('en-GB', { timeZone: TZ, hour12: false });
  const date = now.toLocaleDateString('en-NG', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hour = Number(now.toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }));
  const hubOpen = hour >= 8 && hour < 22;

  return (
    <Card className="relative overflow-hidden lg:col-span-2">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex-1">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Clock className="h-4 w-4 text-cyan-500" /> Time Sync · West Africa Time</p>
          <p className="mt-4 font-mono text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl">{time}</p>
          <p className="mt-2 text-sm text-slate-500">{date}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="cyan">Lagos / Ibadan · UTC+1</Badge>
            <Badge tone={hubOpen ? 'green' : 'amber'}>{hubOpen ? 'Front desk open' : 'After hours · 24/7 access'}</Badge>
          </div>
        </div>
        <div className="relative aspect-[5/4] w-full rounded-3xl border border-slate-200 bg-slate-950 sm:w-64 dark:border-white/10" aria-label="Regional status map">
          <div className="grid-bg absolute inset-0 rounded-3xl opacity-40" />
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full p-4">
            {CITIES.filter((c) => !c.hub).map((c) => (
              <line key={c.name} x1={18} y1={72} x2={c.x} y2={c.y} stroke="rgb(34 211 238 / 0.25)" strokeWidth="0.6" strokeDasharray="2 2" />
            ))}
            {CITIES.map((c) => (
              <g key={c.name}>
                {c.hub && <circle cx={c.x} cy={c.y} r="6" fill="rgb(34 211 238 / 0.25)"><animate attributeName="r" values="3;9;3" dur="2.4s" repeatCount="indefinite" /></circle>}
                <circle cx={c.x} cy={c.y} r={c.hub ? 2.6 : 1.6} fill={c.hub ? '#22d3ee' : '#64748b'} />
                <text x={c.x + 3.5} y={c.y + 1.2} fontSize="5" fill={c.hub ? '#a5f3fc' : '#94a3b8'} fontFamily="JetBrains Mono, monospace">{c.name}</text>
              </g>
            ))}
          </svg>
          <span className="absolute left-3 top-3 font-mono text-[10px] text-emerald-400">● NG GRID · NOMINAL</span>
        </div>
      </div>
    </Card>
  );
}

function WorkspaceTimer({ bookings }: { bookings: Booking[] }) {
  const qc = useQueryClient();
  const now = useNow();
  const active = bookings.find((b) => b.status === 'ACTIVE' && b.endsAt && new Date(b.endsAt) > now);
  const ready = bookings.filter((b) => b.status === 'CONFIRMED' && ['DESK', 'FACILITY'].includes(b.item.category));

  const checkIn = useMutation({
    mutationFn: (id: string) => api<Booking>(`/bookings/${id}/checkin`, { method: 'POST' }),
    onSuccess: (b) => {
      toast.success('Checked in', `${b.item.name} session started.`);
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (e) => toast.error('Check-in failed', errorMessage(e)),
  });

  // Session ended while the page was open: refresh so it moves to COMPLETED.
  useEffect(() => {
    if (!active?.endsAt) return;
    const ms = new Date(active.endsAt).getTime() - Date.now();
    const id = setTimeout(() => qc.invalidateQueries({ queryKey: ['bookings'] }), ms + 500);
    return () => clearTimeout(id);
  }, [active?.endsAt, qc]);

  const R = 52;
  const C = 2 * Math.PI * R;
  let progress = 0;
  let label = '--:--:--';
  if (active?.startsAt && active.endsAt) {
    const total = new Date(active.endsAt).getTime() - new Date(active.startsAt).getTime();
    const left = Math.max(0, new Date(active.endsAt).getTime() - now.getTime());
    progress = left / total;
    const h = Math.floor(left / 3600e3);
    const m = Math.floor((left % 3600e3) / 60e3);
    const s = Math.floor((left % 60e3) / 1000);
    label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return (
    <Card>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Timer className="h-4 w-4 text-cyan-500" /> Workspace Timer</p>
      <div className="mt-4 flex items-center gap-5">
        <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0 -rotate-90">
          <defs>
            <linearGradient id="timer-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#22d3ee" /><stop offset="1" stopColor="#2563eb" /></linearGradient>
          </defs>
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="10" className="stroke-slate-200 dark:stroke-white/10" />
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="10" stroke="url(#timer-grad)" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} style={{ transition: 'stroke-dashoffset 1s linear' }} />
          <text x="60" y="64" textAnchor="middle" className="fill-current font-mono text-[13px] font-semibold" transform="rotate(90 60 60)">{label}</text>
        </svg>
        <div className="min-w-0 flex-1">
          {active ? (
            <>
              <p className="font-display text-lg font-bold">{active.item.name}</p>
              <p className="text-sm text-slate-500">Session ends {new Date(active.endsAt!).toLocaleTimeString('en-NG', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })}</p>
              <Badge tone="cyan" className="mt-2">Active session</Badge>
            </>
          ) : ready.length ? (
            <>
              <p className="text-sm text-slate-500">Paid booking ready:</p>
              <p className="font-semibold">{ready[0].item.name} · {ready[0].quantity} {ready[0].item.unit}(s)</p>
              <Button size="sm" className="mt-3" loading={checkIn.isPending} onClick={() => checkIn.mutate(ready[0].id)}>Check in now</Button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500">No active workspace session.</p>
              <Link to="/app/infra"><Button size="sm" variant="outline" className="mt-3">Book a desk</Button></Link>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function Overview() {
  const user = useAuth((s) => s.user)!;
  const bookings = useQuery({ queryKey: ['bookings'], queryFn: () => api<Booking[]>('/bookings') });
  const finance = useQuery({ queryKey: ['finance'], queryFn: () => api<{ invoices: Invoice[] }>('/finance') });
  const courses = useQuery({ queryKey: ['courses'], queryFn: () => api<Course[]>('/courses') });
  const notifQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ items: Notification[]; unread: number }>('/notifications'),
    refetchInterval: 15_000,
  });

  const outstanding = finance.data?.invoices.filter((i) => i.status === 'PENDING') ?? [];
  const enrolled = courses.data?.filter((c) => c.hasAccess) ?? [];
  const unreadNotifs = notifQuery.data?.unread ?? 0;
  const hour = Number(new Date().toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader eyebrow="Overview" title={`${greeting}, ${user.fullName.split(' ')[0]}`} subtitle="Your hub at a glance — sessions, payments and learning." />

      {unreadNotifs > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-transparent p-4 sm:px-5 sm:py-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-500" />
            </span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              You have <strong className="text-cyan-600 dark:text-cyan-400">{unreadNotifs} unread notice{unreadNotifs === 1 ? '' : 's'}</strong> from administration
            </span>
          </div>
          <Link
            to="/app/notifications"
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-cyan-500/25 hover:brightness-110"
          >
            <span>Check it out</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <TimeSync />
        <WorkspaceTimer bookings={bookings.data ?? []} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Trophy className="h-5 w-5" />} label="Hub points" value={user.points} hint={user.badge} />
        <StatCard icon={<Flame className="h-5 w-5" />} label="Streak" value={`${user.streakDays} day${user.streakDays === 1 ? '' : 's'}`} hint="Visit daily to keep it alive" />
        <StatCard icon={<Receipt className="h-5 w-5" />} label="Outstanding" value={naira(outstanding.reduce((s, i) => s + i.amount, 0))} hint={`${outstanding.length} unpaid invoice(s)`} />
        <StatCard icon={<GraduationCap className="h-5 w-5" />} label="Classrooms" value={enrolled.length} hint="Courses unlocked" />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { to: '/app/infra', icon: Building2, title: 'Book a space', body: 'Desks, facilities & workstations (Lounge coming soon)' },
          { to: '/app/academy', icon: GraduationCap, title: 'Academy', body: 'Enroll in a course or enter your classroom' },
          { to: '/app/transit', icon: Bike, title: 'Transit Dispatch', body: 'Bike, Keke or Cab service · Coming Soon' },
          { to: '/app/network', icon: Users, title: 'Community', body: 'Chat with members and hub support' },
        ].map((a) => (
          <Link key={a.to} to={a.to} className="glass group flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:border-cyan-500/40">
            <span className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-600 dark:text-cyan-400"><a.icon className="h-5 w-5" /></span>
            <span className="flex-1">
              <span className="block font-semibold">{a.title}</span>
              <span className="text-sm text-slate-500">{a.body}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-cyan-500" />
          </Link>
        ))}
      </div>

      {outstanding.length > 0 && (
        <Card className="mt-4 border-amber-500/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">You have {outstanding.length} unpaid invoice{outstanding.length > 1 ? 's' : ''}</p>
              <p className="text-sm text-slate-500">{outstanding.map((i) => i.description).join(' · ')}</p>
            </div>
            <Link to={`/app/finance?invoice=${outstanding[0].id}`}><Button>Pay by bank transfer</Button></Link>
          </div>
        </Card>
      )}
    </>
  );
}
