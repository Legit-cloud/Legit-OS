import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Flag, Globe2, Headset, Lock, MessageSquare, Search, UserPlus, Users, X } from 'lucide-react';
import { ChatPanel } from '../../components/ChatPanel';
import { Avatar, Badge, Button, PageHeader, cn } from '../../components/ui';
import { api } from '../../lib/api';
import { tierLabel } from '../../lib/format';
import { useSocketEvent } from '../../lib/socket';
import type { Member } from '../../lib/types';
import { useAuth } from '../../store/auth';
import { toast } from '../../store/toast';
import { ReportUserModal } from '../../components/ReportUserModal';

const CHANNELS = [
  { key: 'global', title: 'Global Community', subtitle: 'Open chat for every hub member', icon: Globe2 },
  { key: 'support', title: 'Hub Support Desk', subtitle: 'Private line to the hub admin team', icon: Headset },
];

interface RequestItem {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  fullName: string;
  tier: string;
  badge: string;
  role: string;
  createdAt: string;
}

export default function Network() {
  const qc = useQueryClient();
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
  const [sidebarTab, setSidebarTab] = useState<'directory' | 'requests'>('directory');
  const [reportUser, setReportUser] = useState<Member | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);

  const members = useQuery({
    queryKey: ['members', debounced],
    queryFn: () => api<Member[]>(`/network/members?q=${encodeURIComponent(debounced)}`),
  });

  const requests = useQuery({
    queryKey: ['network-requests'],
    queryFn: () => api<{ incoming: RequestItem[]; outgoing: RequestItem[]; accepted: any[] }>('/network/requests'),
    refetchInterval: 10_000,
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'ACCEPT' | 'REJECT' }) =>
      api(`/network/requests/${id}/respond`, { method: 'POST', body: JSON.stringify({ action }) }),
    onSuccess: (_, { action }) => {
      toast.success(
        action === 'ACCEPT' ? 'Request Accepted' : 'Request Declined',
        action === 'ACCEPT' ? 'You can now exchange direct messages.' : 'Message request was declined.'
      );
      qc.invalidateQueries({ queryKey: ['network-requests'] });
      qc.invalidateQueries({ queryKey: ['relationship'] });
    },
    onError: (err) => toast.error('Error', (err as Error).message),
  });

  useSocketEvent<string[]>('presence', (ids) => setOnlineIds(new Set(ids)));

  useSocketEvent<{ channel: string; sender: Member }>('chat:dm', ({ sender }) => {
    if (sender && sender.id !== me?.id) {
      setDms((prev) => (prev.some((m) => m.id === sender.id) ? prev : [sender, ...prev]));
      qc.invalidateQueries({ queryKey: ['network-requests'] });
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

  const pendingIncomingCount = requests.data?.incoming?.length || 0;

  return (
    <>
      <PageHeader eyebrow="Network" title="Community Hub" subtitle="Talk to fellow builders or reach the hub support desk." />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="bento-card flex flex-col gap-4 p-4 lg:h-[calc(100vh-13rem)] lg:min-h-[520px] overflow-hidden">
          {/* Public & Support Channels */}
          <div>
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Channels</p>
            <div className="space-y-1">
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
          </div>

          {/* Active Direct Messages */}
          {dms.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 pb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Direct Messages</p>
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  <Lock className="h-2.5 w-2.5" /> Encrypted
                </span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin overscroll-contain">
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

          {/* Segmented Directory & Requests Tab Control */}
          <div className="flex min-h-0 flex-1 flex-col border-t border-slate-100 pt-3 dark:border-white/5 overflow-hidden">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex rounded-full border border-slate-200 bg-slate-100/70 p-0.5 dark:border-white/10 dark:bg-white/5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setSidebarTab('directory')}
                  className={cn(
                    'rounded-full px-2.5 py-1 transition flex items-center gap-1',
                    sidebarTab === 'directory'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <Users className="h-3 w-3" /> Directory
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab('requests')}
                  className={cn(
                    'rounded-full px-2.5 py-1 transition flex items-center gap-1.5',
                    sidebarTab === 'requests'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <UserPlus className="h-3 w-3" /> Requests
                  {pendingIncomingCount > 0 && (
                    <span className="grid h-4 min-w-4 place-items-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
                      {pendingIncomingCount}
                    </span>
                  )}
                </button>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {sidebarTab === 'directory' ? `${sorted.length} builders` : `${pendingIncomingCount} pending`}
              </span>
            </div>

            {sidebarTab === 'directory' ? (
              <>
                <div className="relative mb-2 shrink-0">
                  <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    className="field rounded-full pl-9 py-1.5 text-xs"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search builders..."
                    aria-label="Search members"
                  />
                </div>

                {/* Member Directory scroll container - guaranteed scrollable on desktop and mobile */}
                <ul
                  className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain scrollbar-thin pr-1 max-h-[380px] lg:max-h-none"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {sorted.map((m) => {
                    const isMe = m.id === me?.id;
                    const isCurrentDm = channel.key === `dm:${m.id}`;
                    return (
                      <li
                        key={m.id}
                        className={cn(
                          'group flex items-center gap-2.5 rounded-2xl px-2.5 py-2 transition text-left',
                          isMe ? 'opacity-70 cursor-default' : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5',
                          isCurrentDm && 'bg-blue-500/10 border border-blue-500/20'
                        )}
                        onClick={() => !isMe && startDirectMessage(m)}
                        title={isMe ? 'You' : `Click to message ${m.fullName}`}
                      >
                        <Avatar name={m.fullName} size="sm" online={isOnline(m)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold flex items-center gap-1.5 text-slate-900 dark:text-white">
                            <span>{m.fullName}</span>
                            {isMe && <span className="text-[10px] text-slate-400 font-mono">(You)</span>}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">{m.badge}</p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {m.role === 'ADMIN' ? (
                            <Badge tone="cyan">Team</Badge>
                          ) : (
                            <Badge tone={m.tier === 'VIP' ? 'violet' : m.tier === 'PRO_MONTHLY' ? 'blue' : 'slate'}>
                              {tierLabel(m.tier)}
                            </Badge>
                          )}
                          {!isMe && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReportUser(m);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition"
                              title={`Report @${m.fullName}`}
                              aria-label="Report member"
                            >
                              <Flag className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {sorted.length === 0 && (
                    <li className="px-3 py-6 text-center text-xs text-slate-500">No members match “{debounced}”.</li>
                  )}
                </ul>
              </>
            ) : (
              /* Message Requests Tab */
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin pr-1 space-y-2">
                {requests.data?.incoming && requests.data.incoming.length > 0 ? (
                  requests.data.incoming.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.fullName} size="sm" />
                        <div className="min-w-0 flex-1 truncate">
                          <p className="text-xs font-bold truncate text-slate-900 dark:text-white">{r.fullName}</p>
                          <p className="text-[10px] text-slate-400 truncate">{tierLabel(r.tier as any)} · {r.badge}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          loading={respondMutation.isPending && respondMutation.variables?.id === r.id}
                          onClick={() => respondMutation.mutate({ id: r.id, action: 'REJECT' })}
                          className="text-[11px] px-2.5 py-1 h-auto"
                        >
                          <X className="h-3 w-3 mr-1" /> Decline
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          loading={respondMutation.isPending && respondMutation.variables?.id === r.id}
                          onClick={() => respondMutation.mutate({ id: r.id, action: 'ACCEPT' })}
                          className="text-[11px] px-2.5 py-1 h-auto"
                        >
                          <Check className="h-3 w-3 mr-1" /> Accept
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center text-xs text-slate-500">
                    <UserPlus className="mx-auto mb-2 h-6 w-6 text-slate-400/60" />
                    No pending message requests.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Real-time End-to-End Chat & Requests Controller */}
        <ChatPanel
          key={channel.key}
          channelKey={channel.key}
          title={channel.title}
          subtitle={channel.subtitle}
          targetUser={channel.targetMember}
        />
      </div>

      {/* Standalone Report Modal when clicked from directory */}
      {reportUser && (
        <ReportUserModal
          open={!!reportUser}
          onClose={() => setReportUser(null)}
          targetUser={reportUser}
        />
      )}
    </>
  );
}
