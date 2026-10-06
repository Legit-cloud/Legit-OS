import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cpu, Database, MemoryStick, Radio, Server, Users } from 'lucide-react';
import { Card, Loading, PageHeader, StatCard, Tabs } from '../../components/ui';
import { TelemetryConsole } from '../../components/TelemetryConsole';
import { api } from '../../lib/api';
import type { TelemetryLog } from '../../lib/types';

interface TelemetryData {
  system: { uptimeSec: number; node: string; platform: string; rssMb: number; heapUsedMb: number; heapTotalMb: number; sockets: number; onlineUsers: number };
  counts: { users: number; invoices: number; messages: number; rides: number };
  logs: TelemetryLog[];
}

const uptime = (s: number) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
};

type Level = 'ALL' | TelemetryLog['level'];

export default function Telemetry() {
  const [level, setLevel] = useState<Level>('ALL');
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'telemetry'],
    queryFn: () => api<TelemetryData>('/admin/telemetry'),
    refetchInterval: 5_000,
  });
  if (isLoading || !data) return <Loading />;
  const { system, counts } = data;
  const heapPct = Math.round((system.heapUsedMb / system.heapTotalMb) * 100);

  return (
    <>
      <PageHeader eyebrow="Cloud Telemetry" title="System health" subtitle="Live server metrics and the full audit log. Refreshes every 5 seconds." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Server className="h-5 w-5" />} label="Uptime" value={uptime(system.uptimeSec)} hint={`${system.node} · ${system.platform}`} />
        <StatCard icon={<MemoryStick className="h-5 w-5" />} label="Memory (RSS)" value={`${system.rssMb} MB`} hint={`Heap ${system.heapUsedMb}/${system.heapTotalMb} MB`} />
        <StatCard icon={<Radio className="h-5 w-5" />} label="Live sockets" value={system.sockets} />
        <StatCard icon={<Users className="h-5 w-5" />} label="Users online" value={system.onlineUsers} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Cpu className="h-4 w-4 text-cyan-500" /> Heap utilisation</p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
            <div className={`h-full rounded-full ${heapPct > 85 ? 'bg-rose-500' : 'bg-gradient-to-r from-cyan-500 to-blue-600'}`} style={{ width: `${heapPct}%` }} />
          </div>
          <p className="mt-2 font-mono text-sm">{heapPct}%</p>
        </Card>
        <Card>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Database className="h-4 w-4 text-cyan-500" /> Database records</p>
          <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
            {Object.entries(counts).map(([k, v]) => (
              <div key={k}><dd className="font-display text-xl font-bold">{v}</dd><dt className="text-xs capitalize text-slate-500">{k}</dt></div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Audit log</h2>
        <Tabs<Level> value={level} onChange={setLevel} options={(['ALL', 'INFO', 'ADMIN', 'SECURITY', 'WARN'] as Level[]).map((l) => ({ value: l, label: l }))} />
      </div>
      <TelemetryConsole initial={data.logs} filter={level} height="h-[480px]" />
    </>
  );
}
