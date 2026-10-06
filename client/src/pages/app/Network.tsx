import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe2, Headset, Search } from 'lucide-react';
import { ChatPanel } from '../../components/ChatPanel';
import { Avatar, Badge, PageHeader, cn } from '../../components/ui';
import { api } from '../../lib/api';
import { tierLabel } from '../../lib/format';
import { useSocketEvent } from '../../lib/socket';
import type { Member } from '../../lib/types';

const CHANNELS = [
  { key: 'global', title: 'Global Community', subtitle: 'Open chat for every hub member', icon: Globe2 },
  { key: 'support', title: 'Hub Support Desk', subtitle: 'Private line to the hub admin team', icon: Headset },
];

export default function Network() {
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [onlineIds, setOnlineIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);

  const members = useQuery({
    queryKey: ['members', debounced],
    queryFn: () => api<Member[]>(`/network/members?q=${encodeURIComponent(debounced)}`),
  });
  useSocketEvent<string[]>('presence', (ids) => setOnlineIds(new Set(ids)));

  const isOnline = (m: Member) => (onlineIds ? onlineIds.has(m.id) : m.online);
  const sorted = [...(members.data ?? [])].sort((a, b) => Number(isOnline(b)) - Number(isOnline(a)));

  return (
    <>
      <PageHeader eyebrow="Network" title="Community Hub" subtitle="Talk to fellow builders or reach the hub support desk." />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="glass flex flex-col gap-5 p-4 lg:h-[calc(100vh-13rem)] lg:min-h-[480px]">
          <div>
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Channels</p>
            {CHANNELS.map((c) => (
              <button
                key={c.key}
                onClick={() => setChannel(c)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition',
                  channel.key === c.key ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' : 'hover:bg-slate-100 dark:hover:bg-white/5',
                )}
              >
                <c.icon className="h-4 w-4" /> {c.title}
              </button>
            ))}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Member directory</p>
            <div className="relative mb-2">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="field rounded-full pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members" aria-label="Search members" />
            </div>
            <ul className="max-h-72 flex-1 space-y-1 overflow-y-auto scrollbar-thin lg:max-h-none">
              {sorted.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-2xl px-2 py-2">
                  <Avatar name={m.fullName} size="sm" online={isOnline(m)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.fullName}</p>
                    <p className="truncate text-xs text-slate-500">{m.badge}</p>
                  </div>
                  {m.role === 'ADMIN' ? <Badge tone="cyan">Team</Badge> : <Badge tone={m.tier === 'VIP' ? 'violet' : m.tier === 'PRO_MONTHLY' ? 'blue' : 'slate'}>{tierLabel(m.tier)}</Badge>}
                </li>
              ))}
              {members.data?.length === 0 && <li className="px-2 py-4 text-sm text-slate-500">No members match “{debounced}”.</li>}
            </ul>
          </div>
        </div>

        <ChatPanel key={channel.key} channelKey={channel.key} title={channel.title} subtitle={channel.subtitle} />
      </div>
    </>
  );
}
