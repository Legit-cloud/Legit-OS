import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe2, Headset, Lock, MessageSquare, Search } from 'lucide-react';
import { ChatPanel } from '../../components/ChatPanel';
import { Avatar, Badge, PageHeader, cn } from '../../components/ui';
import { api } from '../../lib/api';
import { tierLabel } from '../../lib/format';
import { useSocketEvent } from '../../lib/socket';
import type { Member } from '../../lib/types';
import { useAuth } from '../../store/auth';

const CHANNELS = [
  { key: 'global', title: 'Global Community', subtitle: 'Open chat for every hub member', icon: Globe2 },
  { key: 'support', title: 'Hub Support Desk', subtitle: 'Private line to the hub admin team', icon: Headset },
];

export default function Network() {
  const me = useAuth((s) => s.user);
  const [channel, setChannel] = useState<{
    key: string;
    title: string;
    subtitle: string;
    icon: any;
    targetMember?: Member;
  }>(CHANNELS[0]);
  const [dms, setDms] = useState<Member[]>([]);
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

  useSocketEvent<{ channel: string; sender: Member }>('chat:dm', ({ sender }) => {
    if (sender && sender.id !== me?.id) {
      setDms((prev) => (prev.some((m) => m.id === sender.id) ? prev : [sender, ...prev]));
    }
  });

  const isOnline = (m: Member) => (onlineIds ? onlineIds.has(m.id) : m.online);
  const sorted = [...(members.data ?? [])].sort((a, b) => Number(isOnline(b)) - Number(isOnline(a)));

  const startDirectMessage = (m: Member) => {
    if (m.id === me?.id) return;
    setDms((prev) => (prev.some((item) => item.id === m.id) ? prev : [m, ...prev]));
    setChannel({
      key: `dm:${m.id}`,
      title: m.fullName,
      subtitle: `Private encrypted direct message · ${m.role === 'ADMIN' ? 'Hub Team' : tierLabel(m.tier)}`,
      icon: MessageSquare,
      targetMember: m,
    });
  };

  return (
    <>
      <PageHeader eyebrow="Network" title="Community Hub" subtitle="Talk to fellow builders or reach the hub support desk." />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="bento-card flex flex-col gap-5 p-4 lg:h-[calc(100vh-13rem)] lg:min-h-[480px]">
          <div>
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Channels</p>
            {CHANNELS.map((c) => (
              <button
                key={c.key}
                onClick={() => setChannel(c)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition',
                  channel.key === c.key ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-white/5',
                )}
              >
                <c.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" /> {c.title}
              </button>
            ))}
          </div>

          {dms.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 pb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Direct Messages</p>
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  <Lock className="h-2.5 w-2.5" /> Encrypted
                </span>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-thin">
                {dms.map((m) => {
                  const dmKey = `dm:${m.id}`;
                  const active = channel.key === dmKey;
                  return (
                    <button
                      key={m.id}
                      onClick={() =>
                        setChannel({
                          key: dmKey,
                          title: m.fullName,
                          subtitle: `Private encrypted direct message · ${m.role === 'ADMIN' ? 'Hub Team' : tierLabel(m.tier)}`,
                          icon: MessageSquare,
                          targetMember: m,
                        })
                      }
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left text-sm transition',
                        active ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-white/5',
                      )}
                    >
                      <Avatar name={m.fullName} size="sm" online={isOnline(m)} />
                      <div className="min-w-0 flex-1 truncate">
                        <p className="text-xs font-semibold truncate text-slate-900 dark:text-white">{m.fullName}</p>
                        <p className="text-[11px] text-slate-400 truncate">{m.role === 'ADMIN' ? 'Hub Team' : tierLabel(m.tier)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col border-t border-slate-100 pt-3 dark:border-white/5">
            <div className="flex items-center justify-between px-2 pb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Member directory</p>
              <span className="text-[10px] text-slate-400">Click to chat</span>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="field rounded-full pl-10 text-xs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members" aria-label="Search members" />
            </div>
            <ul className="max-h-72 flex-1 space-y-1 overflow-y-auto scrollbar-thin lg:max-h-none">
              {sorted.map((m) => {
                const isMe = m.id === me?.id;
                const isCurrentDm = channel.key === `dm:${m.id}`;
                return (
                  <li
                    key={m.id}
                    onClick={() => !isMe && startDirectMessage(m)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-2.5 py-2 transition text-left',
                      isMe ? 'opacity-70 cursor-default' : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5',
                      isCurrentDm && 'bg-blue-500/10 border border-blue-500/20'
                    )}
                    title={isMe ? 'You' : `Click to send private message to ${m.fullName}`}
                  >
                    <Avatar name={m.fullName} size="sm" online={isOnline(m)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold flex items-center gap-1.5">
                        <span>{m.fullName}</span>
                        {isMe && <span className="text-[10px] text-slate-400 font-mono">(You)</span>}
                      </p>
                      <p className="truncate text-xs text-slate-500">{m.badge}</p>
                    </div>
                    {m.role === 'ADMIN' ? (
                      <Badge tone="cyan">Team</Badge>
                    ) : (
                      <Badge tone={m.tier === 'VIP' ? 'violet' : m.tier === 'PRO_MONTHLY' ? 'blue' : 'slate'}>
                        {tierLabel(m.tier)}
                      </Badge>
                    )}
                  </li>
                );
              })}
              {members.data?.length === 0 && <li className="px-2 py-4 text-sm text-slate-500">No members match “{debounced}”.</li>}
            </ul>
          </div>
        </div>

        <ChatPanel key={channel.key} channelKey={channel.key} title={channel.title} subtitle={channel.subtitle} />
      </div>
    </>
  );
}
