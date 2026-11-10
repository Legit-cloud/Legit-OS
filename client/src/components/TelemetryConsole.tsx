import { useEffect, useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';
import { useSocketEvent } from '../lib/socket';
import type { TelemetryLog } from '../lib/types';
import { cn } from './ui';
import { toast } from '../store/toast';

const LEVEL_COLOR: Record<TelemetryLog['level'], string> = {
  INFO: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  WARN: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  SECURITY: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  ADMIN: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
};

/** Terminal-style log console that streams new telemetry entries over the socket. */
export function TelemetryConsole({ initial, filter, height = 'h-96' }: { initial: TelemetryLog[]; filter?: TelemetryLog['level'] | 'ALL'; height?: string }) {
  const [logs, setLogs] = useState(initial);
  const [copied, setCopied] = useState(false);
  useEffect(() => setLogs(initial), [initial]);
  useSocketEvent<TelemetryLog>('telemetry', (entry) => setLogs((prev) => [entry, ...prev].slice(0, 300)));

  const shown = filter && filter !== 'ALL' ? logs.filter((l) => l.level === filter) : logs;

  const copyLogs = () => {
    const text = shown.map((l) => `[${new Date(l.createdAt).toLocaleTimeString('en-GB', { timeZone: 'Africa/Lagos' })}] [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Logs Copied', `${shown.length} log lines copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="terminal-bezel relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-slate-950 text-slate-200 shadow-xl">
      <div className="scanline-grid absolute inset-0 opacity-15 pointer-events-none" />
      <div className="relative flex items-center justify-between border-b border-white/10 bg-slate-900/90 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <Terminal className="h-3.5 w-3.5 text-cyan-400" />
          <span className="font-mono text-xs font-semibold text-slate-300">hub-telemetry.stream</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={copyLogs}
            className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono text-slate-400 hover:bg-white/10 hover:text-white transition"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-emerald-400">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" /> LIVE
          </span>
        </div>
      </div>
      <ol className={cn('relative space-y-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed scrollbar-thin', height)}>
        {shown.length === 0 && <li className="text-slate-500 py-4 text-center">No telemetry log entries recorded yet.</li>}
        {shown.map((l) => (
          <li key={l.id} className="flex items-start gap-2.5 hover:bg-white/[0.03] px-1 py-0.5 rounded transition">
            <span className="shrink-0 text-slate-500 text-[11px] font-medium">
              {new Date(l.createdAt).toLocaleTimeString('en-GB', { timeZone: 'Africa/Lagos' })}
            </span>
            <span className={cn('shrink-0 px-1.5 py-0.2 rounded border text-[10px] font-bold uppercase', LEVEL_COLOR[l.level])}>
              {l.level}
            </span>
            <span className="min-w-0 break-words text-slate-300 text-[11px]">{l.message}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
