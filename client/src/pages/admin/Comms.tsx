import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Globe2, Megaphone } from 'lucide-react';
import { ChatPanel } from '../../components/ChatPanel';
import { Badge, Button, Card, Field, Modal, PageHeader, cn } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { toast } from '../../store/toast';

interface Thread {
  channel: string;
  user: { id: string; fullName: string; email: string } | null;
  count: number;
  lastAt: string;
  lastMessage: string;
  awaitingReply: boolean;
}

export default function Comms() {
  const [active, setActive] = useState<{ key: string; title: string; subtitle: string }>({ key: 'global', title: 'Global Community', subtitle: 'Moderate the open member channel' });
  const [broadcast, setBroadcast] = useState(false);
  const [msg, setMsg] = useState({ title: '', body: '' });
  const threads = useQuery({ queryKey: ['admin', 'threads'], queryFn: () => api<Thread[]>('/admin/comms/threads'), refetchInterval: 30_000 });

  const send = useMutation({
    mutationFn: () => api<{ delivered: number }>('/admin/comms/broadcast', { body: msg }),
    onSuccess: (r) => {
      toast.success('Broadcast sent', `Delivered to ${r.delivered} members.`);
      setBroadcast(false);
      setMsg({ title: '', body: '' });
    },
    onError: (e) => toast.error('Broadcast failed', errorMessage(e)),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    send.mutate();
  };

  return (
    <>
      <PageHeader eyebrow="Comms" title="Support & broadcasts" subtitle="Answer the Hub Support Desk and send announcements to every member." actions={<Button onClick={() => setBroadcast(true)}><Megaphone className="h-4 w-4" /> Broadcast</Button>} />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="p-3 sm:p-3 lg:h-[calc(100vh-13rem)] lg:min-h-[480px] lg:overflow-y-auto">
          <button
            onClick={() => setActive({ key: 'global', title: 'Global Community', subtitle: 'Moderate the open member channel' })}
            className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold', active.key === 'global' ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' : 'hover:bg-slate-100 dark:hover:bg-white/5')}
          >
            <Globe2 className="h-4 w-4" /> Global Community
          </button>
          <p className="px-3 pb-2 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Support threads</p>
          {threads.data?.length === 0 && <p className="px-3 text-sm text-slate-500">No support conversations yet.</p>}
          {threads.data?.map((t) => (
            <button
              key={t.channel}
              onClick={() => setActive({ key: t.channel, title: t.user?.fullName ?? 'Unknown member', subtitle: `Hub Support Desk · ${t.user?.email ?? ''}` })}
              className={cn('w-full rounded-2xl px-3 py-3 text-left', active.key === t.channel ? 'bg-cyan-500/10' : 'hover:bg-slate-100 dark:hover:bg-white/5')}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">{t.user?.fullName ?? 'Unknown member'}</span>
                {t.awaitingReply ? <Badge tone="amber">Needs reply</Badge> : <span className="text-[11px] text-slate-400">{timeAgo(t.lastAt)}</span>}
              </span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">{t.lastMessage}</span>
            </button>
          ))}
        </Card>
        <ChatPanel key={active.key} channelKey={active.key} title={active.title} subtitle={active.subtitle} />
      </div>

      <Modal open={broadcast} onClose={() => setBroadcast(false)} title="Broadcast to all members">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Title"><input className="field" required minLength={2} maxLength={80} value={msg.title} onChange={(e) => setMsg({ ...msg, title: e.target.value })} /></Field>
          <Field label="Message"><textarea className="field min-h-28" required minLength={2} maxLength={500} value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} /></Field>
          <p className="text-xs text-slate-500">Delivered instantly as an in-app notification to every active member.</p>
          <Button type="submit" className="w-full" loading={send.isPending}><Megaphone className="h-4 w-4" /> Send broadcast</Button>
        </form>
      </Modal>
    </>
  );
}
