import { useEffect, useState } from 'react';
import { Terminal } from 'lucide-react';
import { useSocketEvent } from '../lib/socket';
import type { TelemetryLog } from '../lib/types';
import { cn } from './ui';

const LEVEL_COLOR: Record<TelemetryLog['level'], string> = {
  INFO: 'text-cyan-400',
  WARN: 'text-amber-400',
  SECURITY: 'text-rose-400',
  ADMIN: 'text-violet-400',
};

/** Terminal-style log console that streams new telemetry entries over the socket. */
export function TelemetryConsole({ initial, filter, height = 'h-96' }: { initial: TelemetryLog[]; filter?: TelemetryLog['level'] | 'ALL'; height?: string }) {
  const [logs, setLogs] = useState(initial);
  useEffect(() => setLogs(initial), [initial]);
  useSocketEvent<TelemetryLog>('telemetry', (entry) => setLogs((prev) => [entry, ...prev].slice(0, 300)));

  const shown = filter && filter !== 'ALL' ? logs.filter((l) => l.level === filter) : logs;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-slate-200">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <Terminal className="h-4 w-4 text-cyan-400" />
        <span className="font-mono text-xs text-slate-400">telemetry.log — live</span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> STREAMING</span>
      </div>
      <ol className={cn('space-y-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed scrollbar-thin', height)}>
        {shown.length === 0 && <li className="text-slate-500">No entries.</li>}
        {shown.map((l) => (
          <li key={l.id} className="flex gap-3">
            <span className="shrink-0 text-slate-500">{new Date(l.createdAt).toLocaleTimeString('en-GB', { timeZone: 'Africa/Lagos' })}</span>
            <span className={cn('w-16 shrink-0 font-semibold', LEVEL_COLOR[l.level])}>[{l.level}]</span>
            <span className="min-w-0 break-words">{l.message}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
