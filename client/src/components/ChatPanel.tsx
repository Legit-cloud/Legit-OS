import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, Lock, MessageSquare, Send, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { formatTime, tierLabel } from '../lib/format';
import { getSocket, useSocketEvent } from '../lib/socket';
import type { ChatMessage } from '../lib/types';
import { useAuth } from '../store/auth';
import { toast } from '../store/toast';
import { Avatar, Badge, Loading, cn } from './ui';

interface Thread {
  channel: string;
  messages: ChatMessage[];
}

/**
 * Real-time chat bound to one channel key ("global", "support", or "dm:<id>").
 * History comes over REST; live messages arrive over the socket and are merged into the query cache.
 */
export function ChatPanel({ channelKey, title, subtitle }: { channelKey: string; title: string; subtitle: string }) {
  const qc = useQueryClient();
  const me = useAuth((s) => s.user)!;
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const queryKey = ['messages', channelKey];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => api<Thread>(`/network/messages?channel=${encodeURIComponent(channelKey)}`),
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const join = () => socket.emit('chat:join', channelKey);
    join();
    socket.on('connect', join); // re-join after reconnects
    return () => {
      socket.off('connect', join);
    };
  }, [channelKey]);

  useSocketEvent<ChatMessage>('chat:message', (msg) => {
    qc.setQueryData<Thread>(queryKey, (old) =>
      old && old.channel === msg.channel && !old.messages.some((m) => m.id === msg.id) ? { ...old, messages: [...old.messages, msg] } : old,
    );
  });

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [data?.messages.length]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    const socket = getSocket();
    if (!content || !socket) return;
    setSending(true);
    socket.timeout(8000).emit('chat:send', { channel: channelKey, content }, (err: Error | null, res?: { ok: boolean; error?: string }) => {
      setSending(false);
      if (err || !res?.ok) return toast.error('Message not sent', res?.error ?? 'Connection timed out');
      setText('');
    });
  };

  const isEncrypted = channelKey.startsWith('dm:') || channelKey.startsWith('support');

  return (
    <div className="glass flex h-[calc(100vh-13rem)] min-h-[480px] flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <span className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400 shrink-0">
            {channelKey.startsWith('dm:') ? <MessageSquare className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="font-display font-bold truncate text-slate-900 dark:text-white">{title}</p>
            <p className="text-xs text-slate-500 truncate">{subtitle}</p>
          </div>
        </div>

        {isEncrypted && (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
            <Lock className="h-3 w-3" /> End-to-End Encrypted
          </span>
        )}
      </div>

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

      <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3 dark:border-white/10">
        <input
          className="field rounded-full"
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message ${title}`}
          aria-label="Message"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-40 transition-colors"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
