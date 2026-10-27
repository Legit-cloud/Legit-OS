import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, Clock, Flag, Hash, Lock, MessageSquare, Send, ShieldCheck, UserPlus, X } from 'lucide-react';
import { api } from '../lib/api';
import { formatTime, tierLabel } from '../lib/format';
import { getSocket, useSocketEvent } from '../lib/socket';
import type { ChatMessage } from '../lib/types';
import { useAuth } from '../store/auth';
import { toast } from '../store/toast';
import { Avatar, Badge, Button, Loading, cn } from './ui';
import { ReportUserModal } from './ReportUserModal';

interface Thread {
  channel: string;
  messages: ChatMessage[];
}

interface RelationshipData {
  status: 'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED';
  requestId?: string;
  isSender: boolean;
  isReceiver: boolean;
  canSend: boolean;
  sentCount: number;
  reason?: string;
}

export function ChatPanel({
  channelKey,
  title,
  subtitle,
  targetUser,
}: {
  channelKey: string;
  title: string;
  subtitle: string;
  targetUser?: {
    id: string;
    fullName: string;
    role?: string;
    tier?: string;
  };
}) {
  const qc = useQueryClient();
  const me = useAuth((s) => s.user)!;
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [responding, setResponding] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const queryKey = ['messages', channelKey];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => api<Thread>(`/network/messages?channel=${encodeURIComponent(channelKey)}`),
  });

  const isDm = channelKey.startsWith('dm:');
  const targetId = targetUser?.id;

  const { data: rel, refetch: refetchRel } = useQuery({
    queryKey: ['relationship', targetId],
    queryFn: () => api<RelationshipData>(`/network/relationship?targetUserId=${targetId}`),
    enabled: isDm && !!targetId && targetId !== me.id,
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const join = () => socket.emit('chat:join', channelKey);
    join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
    };
  }, [channelKey]);

  useSocketEvent<ChatMessage>('chat:message', (msg) => {
    if (msg.channel !== channelKey) return;
    qc.setQueryData<Thread>(queryKey, (cur) => {
      if (!cur) return { channel: channelKey, messages: [msg] };
      if (cur.messages.some((m) => m.id === msg.id)) return cur;
      return { ...cur, messages: [...cur.messages, msg] };
    });
    refetchRel();
  });

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages.length]);

  const handleRespondRequest = async (action: 'ACCEPT' | 'REJECT') => {
    if (!rel?.requestId) return;
    setResponding(true);
    try {
      await api(`/network/requests/${rel.requestId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      toast.success(
        action === 'ACCEPT' ? 'Request Accepted' : 'Request Declined',
        action === 'ACCEPT' ? 'You can now chat freely.' : 'Message request declined.'
      );
      await refetchRel();
      qc.invalidateQueries({ queryKey: ['network-requests'] });
    } catch (err) {
      toast.error('Action failed', (err as Error).message);
    } finally {
      setResponding(false);
    }
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;

    if (rel && !rel.canSend) {
      return toast.error('Request pending', rel.reason || 'You can only send one message until the user accepts your request.');
    }

    const socket = getSocket();
    if (!socket) return toast.error('Offline', 'No connection to real-time chat.');

    setSending(true);
    socket.timeout(8000).emit('chat:send', { channel: channelKey, content }, (err: Error | null, res?: { ok: boolean; error?: string }) => {
      setSending(false);
      if (err || !res?.ok) return toast.error('Message not sent', res?.error ?? 'Connection timed out');
      setText('');
      refetchRel();
    });
  };

  const isEncrypted = isDm || channelKey.startsWith('support');
  const isPendingReceiver = rel?.status === 'PENDING' && rel?.isReceiver;
  const isPendingSenderBlocked = rel?.status === 'PENDING' && rel?.isSender && !rel?.canSend;
  const isRejected = rel?.status === 'REJECTED';

  let inputPlaceholder = `Message ${title}`;
  let inputDisabled = sending;

  if (isPendingSenderBlocked) {
    inputPlaceholder = `Waiting for ${targetUser?.fullName || 'user'} to accept your request...`;
    inputDisabled = true;
  } else if (isRejected) {
    inputPlaceholder = `This user declined your chat request.`;
    inputDisabled = true;
  }

  return (
    <div className="glass flex h-[calc(100vh-13rem)] min-h-[480px] flex-col overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <span className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400 shrink-0">
            {isDm ? <MessageSquare className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="font-display font-bold truncate text-slate-900 dark:text-white">{title}</p>
            <p className="text-xs text-slate-500 truncate">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isEncrypted && (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              <Lock className="h-3 w-3" /> End-to-End Encrypted
            </span>
          )}

          {targetUser && targetUser.id !== me.id && (
            <button
              onClick={() => setReportOpen(true)}
              className="flex items-center gap-1 rounded-xl p-1.5 text-xs text-slate-400 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 transition"
              title={`Report ${targetUser.fullName}`}
              aria-label="Report User"
            >
              <Flag className="h-4 w-4" />
              <span className="hidden sm:inline text-[11px] font-medium">Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Friend / Message Request Notification Banners */}
      {isPendingReceiver && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-500/10 border-b border-blue-500/20 px-5 py-3 text-slate-900 dark:text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shrink-0 shadow-sm">
              <UserPlus className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight">
                {targetUser?.fullName || 'This user'} sent you a message request
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Accept to enable 1-on-1 direct conversation with them.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="primary"
              loading={responding}
              onClick={() => handleRespondRequest('ACCEPT')}
              className="text-xs px-3 py-1.5 h-auto"
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={responding}
              onClick={() => handleRespondRequest('REJECT')}
              className="text-xs px-3 py-1.5 h-auto"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Decline
            </Button>
          </div>
        </div>
      )}

      {isPendingSenderBlocked && (
        <div className="flex items-center gap-2.5 bg-amber-500/10 border-b border-amber-500/20 px-5 py-2.5 text-xs text-amber-800 dark:text-amber-200">
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            Message request sent. You can only send one message until{' '}
            <strong>{targetUser?.fullName || 'the recipient'}</strong> accepts your request.
          </span>
        </div>
      )}

      {isRejected && (
        <div className="flex items-center gap-2.5 bg-rose-500/10 border-b border-rose-500/20 px-5 py-2.5 text-xs text-rose-800 dark:text-rose-200">
          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>This member has declined the chat request.</span>
        </div>
      )}

      {/* Message History */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 scrollbar-thin">
        {isLoading ? (
          <Loading />
        ) : (
          <>
            <p className="text-center font-mono text-[11px] uppercase tracking-wider text-slate-400">— you joined {title} —</p>
            {data?.messages.length === 0 && <p className="text-center text-sm text-slate-500">No messages yet. Say hello 👋</p>}
            {data?.messages.map((m, i) => {
              const mine = m.sender.id === me.id;
              const grouped = i > 0 && data.messages[i - 1].sender.id === m.sender.id;
              return (
                <div key={m.id} className={cn('flex gap-3', mine && 'flex-row-reverse', grouped && '-mt-2')}>
                  <div className="w-8 shrink-0">{!grouped && <Avatar name={m.sender.fullName} size="sm" />}</div>
                  <div className={cn('max-w-[78%]', mine && 'items-end text-right')}>
                    {!grouped && (
                      <p className={cn('mb-1 flex flex-wrap items-center gap-1.5 text-xs', mine && 'justify-end')}>
                        <span className="font-semibold">{mine ? 'You' : m.sender.fullName}</span>
                        {m.sender.role === 'ADMIN' ? (
                          <Badge tone="cyan"><ShieldCheck className="h-3 w-3" /> Hub Team</Badge>
                        ) : (
                          <Badge>{tierLabel(m.sender.tier)}</Badge>
                        )}
                        <span className="text-slate-400">{formatTime(m.createdAt)}</span>
                      </p>
                    )}
                    <p
                      className={cn(
                        'inline-block whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-left text-sm',
                        mine ? 'rounded-tr-sm bg-blue-600 text-white' : 'rounded-tl-sm bg-slate-100 text-slate-800 dark:bg-white/[0.06] dark:text-slate-200',
                      )}
                    >
                      {m.content}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottom} />
          </>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3 dark:border-white/10">
        <input
          className="field rounded-full disabled:opacity-60 disabled:cursor-not-allowed"
          value={text}
          disabled={inputDisabled}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          placeholder={inputPlaceholder}
          aria-label="Message"
        />
        <button
          type="submit"
          disabled={!text.trim() || inputDisabled}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-40 transition-colors"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {/* Report Modal */}
      {targetUser && (
        <ReportUserModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          targetUser={targetUser}
        />
      )}
    </div>
  );
}
