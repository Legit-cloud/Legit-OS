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

// Major global & African tech hub time zones mapped onto a 0–100 world/regional telemetry grid.
interface TimeZoneOption {
  id: string;
  city: string;
  region: string;
  zoneName: string;
  tz: string;
  utcLabel: string;
  x: number;
  y: number;
  hub?: boolean;
}

const TIME_ZONES: TimeZoneOption[] = [
  { id: 'ibadan', city: 'Ibadan / Lagos', region: 'Nigeria (Hub HQ)', zoneName: 'West Africa Time', tz: 'Africa/Lagos', utcLabel: 'UTC+1', x: 50, y: 58, hub: true },
  { id: 'london', city: 'London', region: 'United Kingdom', zoneName: 'Greenwich / British Time', tz: 'Europe/London', utcLabel: 'UTC+0', x: 47, y: 28 },
  { id: 'berlin', city: 'Berlin / Paris', region: 'Central Europe', zoneName: 'Central European Time', tz: 'Europe/Berlin', utcLabel: 'UTC+1', x: 53, y: 30 },
  { id: 'cairo', city: 'Cairo / Joburg', region: 'South & North Africa', zoneName: 'Central / South Africa Time', tz: 'Africa/Johannesburg', utcLabel: 'UTC+2', x: 56, y: 74 },
  { id: 'nairobi', city: 'Nairobi', region: 'East Africa', zoneName: 'East Africa Time', tz: 'Africa/Nairobi', utcLabel: 'UTC+3', x: 60, y: 62 },
  { id: 'dubai', city: 'Dubai', region: 'UAE', zoneName: 'Gulf Standard Time', tz: 'Asia/Dubai', utcLabel: 'UTC+4', x: 65, y: 45 },
  { id: 'mumbai', city: 'Bangalore', region: 'India', zoneName: 'India Standard Time', tz: 'Asia/Kolkata', utcLabel: 'UTC+5:30', x: 73, y: 50 },
  { id: 'singapore', city: 'Singapore', region: 'Southeast Asia', zoneName: 'Singapore Standard Time', tz: 'Asia/Singapore', utcLabel: 'UTC+8', x: 80, y: 60 },
  { id: 'tokyo', city: 'Tokyo', region: 'Japan', zoneName: 'Japan Standard Time', tz: 'Asia/Tokyo', utcLabel: 'UTC+9', x: 88, y: 38 },
  { id: 'sydney', city: 'Sydney', region: 'Australia', zoneName: 'Australian Eastern Time', tz: 'Australia/Sydney', utcLabel: 'UTC+10', x: 90, y: 78 },
  { id: 'new_york', city: 'New York', region: 'USA & Canada East', zoneName: 'Eastern Time', tz: 'America/New_York', utcLabel: 'UTC-5', x: 26, y: 36 },
  { id: 'sf', city: 'San Francisco', region: 'Silicon Valley, USA', zoneName: 'Pacific Time', tz: 'America/Los_Angeles', utcLabel: 'UTC-8', x: 14, y: 38 },
];

/** Skeleton stand-in for a stat value while its query loads */
const Dash = () => <span aria-label="Loading" className="skeleton inline-block h-7 w-16 rounded-lg align-middle" />;

function TimeSync() {
  const now = useNow();

  const [selectedTzId, setSelectedTzId] = useState<string>(() => {
    try {
      return localStorage.getItem('legit_tz_id') || 'ibadan';
    } catch {
      return 'ibadan';
    }
  });

  const [use12Hour, setUse12Hour] = useState<boolean>(() => {
    try {
      return localStorage.getItem('legit_time_12h') === '1';
    } catch {
      return false;
    }
  });

  const activeZone = TIME_ZONES.find((z) => z.id === selectedTzId) ?? TIME_ZONES[0];
  const hubZone = TIME_ZONES[0];

  const handleTzChange = (id: string) => {
    setSelectedTzId(id);
    try {
      localStorage.setItem('legit_tz_id', id);
    } catch {}
  };

  const toggleHourFormat = (is12h: boolean) => {
    setUse12Hour(is12h);
    try {
      localStorage.setItem('legit_time_12h', is12h ? '1' : '0');
    } catch {}
  };

  const formattedTime = now.toLocaleTimeString('en-US', {
    timeZone: activeZone.tz,
    hour12: use12Hour,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const [timeDigits, amPm] = use12Hour ? formattedTime.split(' ') : [formattedTime, ''];

  const date = now.toLocaleDateString('en-GB', {
    timeZone: activeZone.tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Hub open status is always anchored to physical Ibadan Hub hours (09:00 AM - 05:00 PM WAT)
  const hubHour = Number(now.toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }));
  const hubOpen = hubHour >= 9 && hubHour < 17;
  const hubHoursLabel = use12Hour ? '09:00 AM - 05:00 PM' : '09:00 - 17:00';

  return (
    <Card variant="bento" className="relative order-2 overflow-hidden lg:order-1 lg:col-span-2">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#155dfd]">
              <span className="flex h-2 w-2 rounded-full bg-[#155dfd] animate-ping" />
              <Clock className="h-4 w-4 text-[#155dfd]" />
              <span>Time Sync · {activeZone.zoneName}</span>
            </div>

            {/* 12H / 24H Format Switch */}
            <div
              role="group"
              aria-label="Time format"
              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100/80 p-0.5 text-[11px] font-mono font-bold"
            >
              <button
                type="button"
                onClick={() => toggleHourFormat(false)}
                className={cn(
                  'rounded-full px-2.5 py-0.5 transition-all cursor-pointer',
                  !use12Hour
                    ? 'bg-[#155dfd] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                24H
              </button>
              <button
                type="button"
                onClick={() => toggleHourFormat(true)}
                className={cn(
                  'rounded-full px-2.5 py-0.5 transition-all cursor-pointer',
                  use12Hour
                    ? 'bg-[#155dfd] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                12H
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2.5">
            <p className="font-mono text-4xl font-extrabold tabular-nums tracking-tight text-slate-900 sm:text-6xl drop-shadow-sm">
              {timeDigits}
            </p>
            {use12Hour && amPm && (
              <span className="rounded-lg border border-blue-500/20 bg-blue-50 px-2 py-0.5 font-mono text-sm font-bold uppercase text-[#155dfd] sm:text-base">
                {amPm}
              </span>
            )}
          </div>

          <p className="mt-2 text-sm font-medium text-slate-500">{date}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge tone="cyan">
              {activeZone.city} · {activeZone.utcLabel}
            </Badge>
            <Badge tone={hubOpen ? 'green' : 'amber'}>
              {hubOpen ? `● Hub doors open (${hubHoursLabel})` : `● Hub closed · Opens ${use12Hour ? '09:00 AM' : '09:00'} (${hubHoursLabel})`}
            </Badge>
          </div>
        </div>

        {/* Interactive Telemetry Map with Time Zone Selector */}
        <div
          className="relative aspect-[5/4] w-full rounded-2xl border border-slate-200/80 bg-slate-950 sm:w-80 shadow-inner overflow-hidden"
          aria-label="Global time zone telemetry map"
        >
          <div className="grid-bg absolute inset-0 opacity-40" />
          <div className="absolute inset-0 bg-radial from-cyan-500/15 via-transparent to-transparent pointer-events-none" />

          {/* Top Bar on Map: Time Zone Dropdown Selector */}
          <div className="relative z-10 flex items-center justify-between gap-2 border-b border-white/10 bg-slate-900/85 px-3 py-2 backdrop-blur-md">
            <div className="flex items-center gap-1.5 font-mono text-[9px] font-semibold text-emerald-400 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>SYNC</span>
            </div>

            <select
              aria-label="Select time zone"
              value={activeZone.id}
              onChange={(e) => handleTzChange(e.target.value)}
              className="w-full max-w-[200px] truncate rounded-lg border border-white/15 bg-slate-950/90 px-2 py-1 font-mono text-[10px] font-semibold text-cyan-300 outline-none transition hover:border-cyan-400/50 focus:border-cyan-400 cursor-pointer"
            >
              {TIME_ZONES.map((z) => (
                <option key={z.id} value={z.id} className="bg-slate-900 text-slate-100">
                  {z.city} ({z.utcLabel})
                </option>
              ))}
            </select>
          </div>

          <svg viewBox="0 0 100 85" className="absolute inset-x-0 bottom-0 top-8 h-[calc(100%-2rem)] w-full p-2.5">
            {/* Connection vectors from Ibadan Hub to global nodes */}
            {TIME_ZONES.filter((z) => !z.hub).map((z) => {
              const isSelected = z.id === activeZone.id;
              return (
                <line
                  key={z.id}
                  x1={hubZone.x}
                  y1={hubZone.y}
                  x2={z.x}
                  y2={z.y}
                  stroke={isSelected ? 'rgb(56 189 248 / 0.85)' : 'rgb(34 211 238 / 0.22)'}
                  strokeWidth={isSelected ? '0.9' : '0.5'}
                  strokeDasharray={isSelected ? 'none' : '2 2'}
                />
              );
            })}

            {/* Interactive City Nodes */}
            {TIME_ZONES.map((z) => {
              const isSelected = z.id === activeZone.id;
              const isHub = Boolean(z.hub);
              return (
                <g
                  key={z.id}
                  onClick={() => handleTzChange(z.id)}
                  className="cursor-pointer"
                >
                  {(isSelected || isHub) && (
                    <>
                      <circle
                        cx={z.x}
                        cy={z.y}
                        r={isSelected ? '8' : '5'}
                        fill="none"
                        stroke={isSelected ? 'rgb(56 189 248 / 0.35)' : 'rgb(16 185 129 / 0.25)'}
                        strokeWidth="0.5"
                      >
                        <animate attributeName="r" values="2.5;9;2.5" dur="2.8s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.85;0;0.85" dur="2.8s" repeatCount="indefinite" />
                      </circle>
                      <circle
                        cx={z.x}
                        cy={z.y}
                        r="4.5"
                        fill={isSelected ? 'rgb(56 189 248 / 0.3)' : 'rgb(16 185 129 / 0.2)'}
                      />
                    </>
                  )}
                  <circle
                    cx={z.x}
                    cy={z.y}
                    r={isSelected ? 2.6 : isHub ? 2.2 : 1.5}
                    fill={isSelected ? '#38bdf8' : isHub ? '#34d399' : '#64748b'}
                  />
                  {(isSelected || isHub || ['london', 'new_york', 'tokyo', 'dubai', 'sydney', 'sf'].includes(z.id)) && (
                    <text
                      x={z.x > 75 ? z.x - 3 : z.x + 3}
                      y={z.y + 1.2}
                      textAnchor={z.x > 75 ? 'end' : 'start'}
                      fontSize={isSelected ? '4.4' : '3.8'}
                      fontWeight={isSelected || isHub ? 'bold' : 'normal'}
                      fill={isSelected ? '#38bdf8' : isHub ? '#6ee7b7' : '#94a3b8'}
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {z.city.split(' / ')[0]}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Bottom status caption inside map */}
          <div className="pointer-events-none absolute inset-x-3 bottom-2 flex items-center justify-between font-mono text-[9px] text-slate-400">
            <span className="truncate text-cyan-300 font-semibold">{activeZone.region}</span>
            <span>Click pin or select ↑</span>
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
    <Card variant="bento" className="order-1 flex flex-col justify-between lg:order-2">
      <div>
        {hasHardware && hasWorkspace ? (
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTab('workspace')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition',
                tab === 'workspace'
                  ? 'bg-white shadow-sm text-cyan-600'
                  : 'text-slate-500 hover:text-slate-900'
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
                  ? 'bg-white shadow-sm text-cyan-600'
                  : 'text-slate-500 hover:text-slate-900'
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
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Laptop className="h-4 w-4 text-cyan-500 shrink-0" /> Workstation Timer
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Timer className="h-4 w-4 text-cyan-500 shrink-0" /> Workspace Timer
              </p>
            )}

            {tab === 'hardware' ? (
              activeHardware ? (
                <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-bold text-cyan-600 border border-cyan-500/20 whitespace-nowrap">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping shrink-0" />
                  Active
                </span>
              ) : readyHardware ? (
                <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 border border-amber-500/20 whitespace-nowrap">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  Ready
                </span>
              ) : null
            ) : active ? (
              <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-bold text-cyan-600 border border-cyan-500/20 whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping shrink-0" />
                Active
              </span>
            ) : ready.length > 0 ? (
              <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 border border-emerald-500/20 whitespace-nowrap">
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
              className="stroke-slate-100"
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
                  ? 'fill-cyan-600'
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-600 border border-cyan-500/20 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping shrink-0" />
                      Active Rental
                    </span>
                  </div>
                  <p className="font-display text-base font-bold text-slate-900 truncate mt-1">
                    {activeHardware.item.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 truncate">
                    Return by {activeHardware.endsAt ? formatDateTime(activeHardware.endsAt) : 'Pending'}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-cyan-600 flex items-center gap-1">
                    <Laptop className="h-3.5 w-3.5 shrink-0" /> In your possession
                  </p>
                </div>
              ) : readyHardware ? (
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 border border-amber-500/20 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    Awaiting Pickup
                  </span>
                  <p className="font-display text-base font-bold text-slate-900 truncate mt-1">
                    {readyHardware.item.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Duration: {readyHardware.quantity} {readyHardware.item.unit}{readyHardware.quantity > 1 ? 's' : ''}
                  </p>
                  <p className="mt-1 text-[11px] text-amber-600">
                    Collect at front desk to start timer
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-sm text-slate-800">
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
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-600 border border-cyan-500/20 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping shrink-0" />
                    Active Session
                  </span>
                </div>
                <p className="font-display text-base font-bold text-slate-900 truncate mt-1">
                  {active.item.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 truncate">
                  Ends at {new Date(active.endsAt!).toLocaleTimeString('en-NG', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-cyan-600">
                  Session currently in progress
                </p>
              </div>
            ) : currentReady ? (
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/20 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Ready to Start
                </span>
                <p className="font-display text-base font-bold text-slate-900 truncate mt-1">
                  {currentReady.item.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Duration: {currentReady.quantity} {currentReady.item.unit}{currentReady.quantity > 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-sm text-slate-800">
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
      <div className="mt-4 pt-3 border-t border-slate-100">
        {tab === 'hardware' ? (
          activeHardware ? (
            <p className="text-xs text-slate-400 text-center">
              Please return device to reception before your timer concludes.
            </p>
          ) : readyHardware ? (
            <p className="text-xs text-amber-600 text-center font-medium">
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
                <span className="font-semibold text-slate-700">{ready.length} other session{ready.length > 1 ? 's' : ''}</span> queued after this.
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
              <span className="font-semibold text-slate-600">Choose session to start:</span>
              <span className="text-slate-400 font-mono text-[11px]">{ready.length} ready</span>
            </div>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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

      {outstanding.length > 0 && (
        <Card variant="bento" className="mb-4 border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display font-bold text-amber-700">
                You have {outstanding.length} unpaid invoice{outstanding.length > 1 ? 's' : ''}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">{outstanding.map((i) => i.description).join(' · ')}</p>
            </div>
            <Link to={`/app/finance?invoice=${outstanding[0].id}`} className="max-sm:[&>button]:w-full">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-md shadow-amber-500/20 hover:brightness-110">
                Pay by bank transfer
              </Button>
            </Link>
          </div>
        </Card>
      )}
      {unreadNotifs > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-3xl border border-blue-500/30 bg-blue-50/70 p-4 sm:px-5 sm:py-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
            </span>
            <span className="text-sm font-semibold text-slate-800">
              You have <strong className="text-blue-600">{unreadNotifs} unread notice{unreadNotifs === 1 ? '' : 's'}</strong> from administration
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
              : 'border-blue-500/30 bg-blue-50/50'
          )}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span
              className={cn(
                'shrink-0 rounded-2xl p-2.5',
                hw.status === 'CONFIRMED'
                  ? 'bg-amber-500/20 text-amber-600'
                  : 'bg-blue-500/20 text-blue-600'
              )}
            >
              <Laptop className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 truncate">
                {hw.status === 'CONFIRMED'
                  ? `Workstation Reserved: ${hw.item.name} (${hw.quantity} ${hw.item.unit}${hw.quantity > 1 ? 's' : ''})`
                  : `Workstation in Use: ${hw.item.name}`}
              </p>
              <p className="text-xs text-slate-500 truncate">
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
        <StatCard icon={<Receipt className="h-5 w-5" />} label="Outstanding" value={finance.isLoading ? <Dash /> : naira(outstanding.reduce((s, i) => s + i.amount, 0))} hint={`${outstanding.length} unpaid invoice(s)`} />
        <StatCard icon={<GraduationCap className="h-5 w-5" />} label="Classrooms" value={courses.isLoading ? <Dash /> : enrolled.length} hint="Courses unlocked" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { to: '/app/infra', icon: Building2, title: 'Book a space', body: 'Desks, facilities & workstations (Lounge coming soon)' },
          { to: '/app/academy', icon: GraduationCap, title: 'Academy', body: 'Enroll in a course or enter your classroom' },
          { to: '/app/transit', icon: Bike, title: 'Transit Dispatch', body: 'Bike, Keke or Cab service · Coming Soon' },
          { to: '/app/network', icon: Users, title: 'Community', body: 'Chat with members and hub support' },
        ].map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="bento-card tap group flex flex-col gap-3 p-4 transition-all duration-300 sm:flex-row sm:items-start sm:gap-4 sm:p-5 [@media(hover:hover)]:hover:-translate-y-1 active:scale-[0.98]"
          >
            <span className="w-fit rounded-2xl bg-blue-50 text-blue-600 transition group-hover:scale-110 group-hover:bg-blue-100 p-3">
              <a.icon className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block font-display font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {a.title}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                {a.body}
              </span>
            </span>
            <ArrowRight className="hidden h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600 sm:block" />
          </Link>
        ))}
      </div>

    </>
  );
}
