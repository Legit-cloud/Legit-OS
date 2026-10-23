import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Clock, Flame, GraduationCap, Receipt, Timer, Trophy, Building2, Bike, Users, Laptop } from 'lucide-react';
import { Badge, Button, Card, PageHeader, StatCard, cn } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { TZ, naira, formatDateTime } from '../../lib/format';
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
    <Card variant="bento" className="relative overflow-hidden lg:col-span-2">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping" />
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Time Sync · West Africa Time</span>
          </div>
          <p className="mt-4 font-mono text-5xl font-extrabold tabular-nums tracking-tight text-slate-900 sm:text-6xl dark:text-white drop-shadow-sm">
            {time}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{date}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge tone="cyan">Lagos / Ibadan · UTC+1</Badge>
            <Badge tone={hubOpen ? 'green' : 'amber'}>
              {hubOpen ? '● Hub doors open (08:00 - 22:00)' : '● After hours · 24/7 keycard access'}
            </Badge>
          </div>
        </div>

        <div className="relative aspect-[5/4] w-full rounded-2xl border border-slate-200/80 bg-slate-950 sm:w-72 dark:border-white/10 shadow-inner overflow-hidden" aria-label="Regional status map">
          <div className="grid-bg absolute inset-0 opacity-40" />
          <div className="absolute inset-0 bg-radial from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full p-3.5">
            {CITIES.filter((c) => !c.hub).map((c) => (
              <line
                key={c.name}
                x1={18}
                y1={72}
                x2={c.x}
                y2={c.y}
                stroke="rgb(34 211 238 / 0.3)"
                strokeWidth="0.65"
                strokeDasharray="2.5 2.5"
              />
            ))}
            {CITIES.map((c) => (
              <g key={c.name}>
                {c.hub && (
                  <>
                    <circle cx={c.x} cy={c.y} r="10" fill="none" stroke="rgb(34 211 238 / 0.2)" strokeWidth="0.5">
                      <animate attributeName="r" values="3;12;3" dur="3s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0;0.8" dur="3s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={c.x} cy={c.y} r="6" fill="rgb(34 211 238 / 0.3)">
                      <animate attributeName="r" values="3;8;3" dur="2.4s" repeatCount="indefinite" />
                    </circle>
                  </>
                )}
                <circle cx={c.x} cy={c.y} r={c.hub ? 2.8 : 1.6} fill={c.hub ? '#22d3ee' : '#64748b'} />
                <text
                  x={c.x + 3.5}
                  y={c.y + 1.2}
                  fontSize="4.8"
                  fontWeight={c.hub ? 'bold' : 'normal'}
                  fill={c.hub ? '#38bdf8' : '#94a3b8'}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {c.name}
                </text>
              </g>
            ))}
          </svg>
          <div className="absolute left-3 top-3 flex items-center gap-1.5 font-mono text-[9px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>NG TELEMETRY · NOMINAL</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function WorkspaceTimer({ bookings }: { bookings: Booking[] }) {
  const qc = useQueryClient();
  const now = useNow();
  const [selectedId, setSelectedId] = useState<string>('');

  const active = bookings.find((b) => b.status === 'ACTIVE' && b.endsAt && new Date(b.endsAt) > now && ['DESK', 'FACILITY'].includes(b.item.category));
  const ready = bookings.filter((b) => b.status === 'CONFIRMED' && ['DESK', 'FACILITY'].includes(b.item.category));
  const currentReady = ready.find((b) => b.id === selectedId) ?? ready[0];

  const activeHardware = bookings.find((b) => b.status === 'ACTIVE' && b.endsAt && new Date(b.endsAt) > now && b.item.category === 'HARDWARE');
  const readyHardware = bookings.find((b) => b.status === 'CONFIRMED' && b.item.category === 'HARDWARE');

  const hasHardware = Boolean(activeHardware || readyHardware);
  const hasWorkspace = Boolean(active || ready.length > 0);

  const [tab, setTab] = useState<'workspace' | 'hardware'>('workspace');

  useEffect(() => {
    if (activeHardware && !active) {
      setTab('hardware');
    } else if (active && !activeHardware) {
      setTab('workspace');
    }
  }, [activeHardware?.id, active?.id]);

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
    const relevantEndsAt = tab === 'hardware' ? activeHardware?.endsAt : active?.endsAt;
    if (!relevantEndsAt) return;
    const ms = new Date(relevantEndsAt).getTime() - Date.now();
    const id = setTimeout(() => qc.invalidateQueries({ queryKey: ['bookings'] }), ms + 500);
    return () => clearTimeout(id);
  }, [active?.endsAt, activeHardware?.endsAt, tab, qc]);

  const R = 46;
  const C = 2 * Math.PI * R;

  // Workspace Desk progress
  let progress = 0;
  let label = '--:--:--';
  if (active?.startsAt && active.endsAt) {
    const total = new Date(active.endsAt).getTime() - new Date(active.startsAt).getTime();
    const left = Math.max(0, new Date(active.endsAt).getTime() - now.getTime());
    progress = total > 0 ? left / total : 0;
    const h = Math.floor(left / 3600e3);
    const m = Math.floor((left % 3600e3) / 60e3);
    const s = Math.floor((left % 60e3) / 1000);
    label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // Hardware Workstation progress
  let hwProgress = 0;
  let hwLabel = '--:--:--';
  if (activeHardware?.startsAt && activeHardware.endsAt) {
    const total = new Date(activeHardware.endsAt).getTime() - new Date(activeHardware.startsAt).getTime();
    const left = Math.max(0, new Date(activeHardware.endsAt).getTime() - now.getTime());
    hwProgress = total > 0 ? left / total : 0;
    const d = Math.floor(left / (24 * 3600e3));
    const h = Math.floor((left % (24 * 3600e3)) / 3600e3);
    const m = Math.floor((left % 3600e3) / 60e3);
    const s = Math.floor((left % 60e3) / 1000);
    hwLabel = d > 0 ? `${d}d ${String(h).padStart(2, '0')}h` : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return (
    <Card variant="bento" className="flex flex-col justify-between">
      <div>
        {hasHardware && hasWorkspace ? (
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-white/5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTab('workspace')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition',
                tab === 'workspace'
                  ? 'bg-white shadow-sm dark:bg-slate-800 text-cyan-600 dark:text-cyan-400'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <Timer className="h-3.5 w-3.5 shrink-0" />
              <span>Workspace</span>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping shrink-0" />}
            </button>
            <button
              type="button"
              onClick={() => setTab('hardware')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition',
                tab === 'hardware'
                  ? 'bg-white shadow-sm dark:bg-slate-800 text-cyan-600 dark:text-cyan-400'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <Laptop className="h-3.5 w-3.5 shrink-0" />
              <span>Workstation</span>
              {activeHardware && <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping shrink-0" />}
              {readyHardware && !activeHardware && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {hasHardware ? (
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Laptop className="h-4 w-4 text-cyan-500 shrink-0" /> Workstation Timer
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Timer className="h-4 w-4 text-cyan-500 shrink-0" /> Workspace Timer
              </p>
            )}

            {tab === 'hardware' ? (
              activeHardware ? (
                <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 whitespace-nowrap">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping shrink-0" />
                  Active
                </span>
              ) : readyHardware ? (
                <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  Ready
                </span>
              ) : null
            ) : active ? (
              <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping shrink-0" />
                Active
              </span>
            ) : ready.length > 0 ? (
              <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                {ready.length} Ready
              </span>
            ) : null}
          </div>
        )}

        {/* Timer display section */}
        <div className="mt-4 flex items-center gap-4">
          <svg viewBox="0 0 110 110" className="h-28 w-28 shrink-0 -rotate-90 drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]">
            <defs>
              <linearGradient id="timer-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#22d3ee" />
                <stop offset="1" stopColor="#2563eb" />
              </linearGradient>
              <linearGradient id="hw-timer-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#a855f7" />
                <stop offset="0.5" stopColor="#06b6d4" />
                <stop offset="1" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <circle
              cx="55"
              cy="55"
              r={R}
              fill="none"
              strokeWidth="7"
              className="stroke-slate-100 dark:stroke-white/5"
            />
            <circle
              cx="55"
              cy="55"
              r={R}
              fill="none"
              strokeWidth="7"
              stroke={
                tab === 'hardware'
                  ? activeHardware
                    ? 'url(#hw-timer-grad)'
                    : 'transparent'
                  : active
                  ? 'url(#timer-grad)'
                  : 'transparent'
              }
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - (tab === 'hardware' ? hwProgress : progress))}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
            <text
              x="55"
              y="59"
              textAnchor="middle"
              className={cn(
                'font-mono text-xs font-bold tabular-nums',
                (tab === 'hardware' ? activeHardware : active)
                  ? 'fill-cyan-600 dark:fill-cyan-400'
                  : 'fill-slate-400'
              )}
              transform="rotate(90 55 55)"
            >
              {tab === 'hardware' ? hwLabel : label}
            </text>
          </svg>

          <div className="min-w-0 flex-1">
            {tab === 'hardware' ? (
              activeHardware ? (
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping shrink-0" />
                      Active Rental
                    </span>
                  </div>
                  <p className="font-display text-base font-bold text-slate-900 dark:text-white truncate mt-1">
                    {activeHardware.item.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 truncate">
                    Return by {activeHardware.endsAt ? formatDateTime(activeHardware.endsAt) : 'Pending'}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                    <Laptop className="h-3.5 w-3.5 shrink-0" /> In your possession
                  </p>
                </div>
              ) : readyHardware ? (
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    Awaiting Pickup
                  </span>
                  <p className="font-display text-base font-bold text-slate-900 dark:text-white truncate mt-1">
                    {readyHardware.item.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Duration: {readyHardware.quantity} {readyHardware.item.unit}{readyHardware.quantity > 1 ? 's' : ''}
                  </p>
                  <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                    Collect at front desk to start timer
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    No active workstation
                  </p>
                  <p className="mt-1 text-xs text-slate-500 leading-normal">
                    Rent high-performance laptops & PCs under Infrastructure.
                  </p>
                </div>
              )
            ) : active ? (
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping shrink-0" />
                    Active Session
                  </span>
                </div>
                <p className="font-display text-base font-bold text-slate-900 dark:text-white truncate mt-1">
                  {active.item.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 truncate">
                  Ends at {new Date(active.endsAt!).toLocaleTimeString('en-NG', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-cyan-600 dark:text-cyan-400">
                  Session currently in progress
                </p>
              </div>
            ) : currentReady ? (
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Ready to Start
                </span>
                <p className="font-display text-base font-bold text-slate-900 dark:text-white truncate mt-1">
                  {currentReady.item.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Duration: {currentReady.quantity} {currentReady.item.unit}{currentReady.quantity > 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  No active session
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-normal">
                  Book a desk or private facility to start working.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action / Selection Footer Area */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
        {tab === 'hardware' ? (
          activeHardware ? (
            <p className="text-xs text-slate-400 text-center">
              Please return device to reception before your timer concludes.
            </p>
          ) : readyHardware ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center font-medium">
              Present your reservation to reception to collect device.
            </p>
          ) : (
            <Link to="/app/infra" className="block">
              <Button variant="outline" size="sm" className="w-full">
                Rent a workstation
              </Button>
            </Link>
          )
        ) : active ? (
          <div>
            {ready.length > 0 ? (
              <p className="text-xs text-slate-500 text-center">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{ready.length} other session{ready.length > 1 ? 's' : ''}</span> queued after this.
              </p>
            ) : (
              <p className="text-xs text-slate-400 text-center">
                Timer will automatically conclude when time expires.
              </p>
            )}
          </div>
        ) : ready.length > 1 ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Choose session to start:</span>
              <span className="text-slate-400 font-mono text-[11px]">{ready.length} ready</span>
            </div>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-100"
              value={currentReady?.id}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {ready.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.item.name} ({b.quantity} {b.item.unit}{b.quantity > 1 ? 's' : ''})
                </option>
              ))}
            </select>
            <Button
              className="w-full"
              loading={checkIn.isPending}
              onClick={() => currentReady && checkIn.mutate(currentReady.id)}
            >
              Check in to {currentReady?.item.name}
            </Button>
          </div>
        ) : ready.length === 1 ? (
          <Button
            className="w-full"
            loading={checkIn.isPending}
            onClick={() => checkIn.mutate(ready[0].id)}
          >
            Check in now ({ready[0].quantity} {ready[0].item.unit})
          </Button>
        ) : (
          <Link to="/app/infra" className="block">
            <Button variant="outline" size="sm" className="w-full">
              Book a workspace
            </Button>
          </Link>
        )}
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
  const activeHardware = (bookings.data ?? []).filter(
    (b) => ['CONFIRMED', 'ACTIVE'].includes(b.status) && b.item.category === 'HARDWARE'
  );
  const hour = Number(new Date().toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader eyebrow="Overview" title={`${greeting}, ${user.fullName.split(' ')[0]}`} subtitle="Your hub at a glance — sessions, payments and learning." />

      {unreadNotifs > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-3xl border border-blue-500/30 bg-blue-50/70 p-4 sm:px-5 sm:py-3.5 shadow-sm dark:bg-blue-950/20 dark:border-blue-500/30">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
            </span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              You have <strong className="text-blue-600 dark:text-blue-400">{unreadNotifs} unread notice{unreadNotifs === 1 ? '' : 's'}</strong> from administration
            </span>
          </div>
          <Link
            to="/app/notifications"
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
          >
            <span>Check it out</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {activeHardware.map((hw) => (
        <div
          key={hw.id}
          className={cn(
            'mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-3xl border p-4 sm:px-5 sm:py-3.5 shadow-sm overflow-hidden',
            hw.status === 'CONFIRMED'
              ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent'
              : 'border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20'
          )}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span
              className={cn(
                'shrink-0 rounded-2xl p-2.5',
                hw.status === 'CONFIRMED'
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
              )}
            >
              <Laptop className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                {hw.status === 'CONFIRMED'
                  ? `Workstation Reserved: ${hw.item.name} (${hw.quantity} ${hw.item.unit}${hw.quantity > 1 ? 's' : ''})`
                  : `Workstation in Use: ${hw.item.name}`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {hw.status === 'CONFIRMED'
                  ? 'Ready for pickup! Please visit the hub reception desk to collect your workstation.'
                  : `In your possession · Return deadline: ${hw.endsAt ? formatDateTime(hw.endsAt) : 'Pending'}`}
              </p>
            </div>
          </div>
          <Badge
            tone={hw.status === 'CONFIRMED' ? 'amber' : 'blue'}
            className="shrink-0 self-start md:self-auto whitespace-nowrap"
          >
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', hw.status === 'CONFIRMED' ? 'bg-amber-500' : 'bg-blue-600 animate-ping')} />
            {hw.status === 'CONFIRMED' ? 'Ready for Pickup' : 'Active Rental'}
          </Badge>
        </div>
      ))}

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
          <Link
            key={a.to}
            to={a.to}
            className="bento-card group flex items-start gap-4 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5"
          >
            <span className="rounded-2xl bg-blue-50 text-blue-600 transition group-hover:scale-110 group-hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:group-hover:bg-blue-500/20 p-3">
              <a.icon className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block font-display font-bold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 transition-colors">
                {a.title}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {a.body}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600" />
          </Link>
        ))}
      </div>

      {outstanding.length > 0 && (
        <Card variant="bento" className="mt-4 border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display font-bold text-amber-700 dark:text-amber-400">
                You have {outstanding.length} unpaid invoice{outstanding.length > 1 ? 's' : ''}
              </p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{outstanding.map((i) => i.description).join(' · ')}</p>
            </div>
            <Link to={`/app/finance?invoice=${outstanding[0].id}`}>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-md shadow-amber-500/20 hover:brightness-110">
                Pay by bank transfer
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </>
  );
}
