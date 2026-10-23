import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ExternalLink, Gamepad2, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Field, Loading, Modal, PageHeader } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { HubEvent } from '../../lib/types';
import { toast } from '../../store/toast';

type AdminEvent = HubEvent & { _count: { rsvps: number } };
const EMPTY = { kind: 'EVENT' as HubEvent['kind'], title: '', description: '', location: 'L.E.G.I.T Hub, Ibadan', startsAt: '', capacity: 50, externalUrl: '' };

export default function AdminEvents() {
  const qc = useQueryClient();
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'events'], queryFn: () => api<AdminEvent[]>('/admin/events') });

  const create = useMutation({
    mutationFn: (f: typeof EMPTY) =>
      api('/admin/events', {
        body: { ...f, startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : null, externalUrl: f.externalUrl || null },
      }),
    onSuccess: () => {
      toast.success('Published');
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin', 'events'] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (e) => toast.error('Could not publish', errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/events/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'events'] }),
    onError: (e) => toast.error('Delete failed', errorMessage(e)),
  });

  if (isLoading || !data) return <Loading />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form) create.mutate(form);
  };

  return (
    <>
      <PageHeader eyebrow="Events & Games" title="Programming" subtitle="Publish hub events and community web games." actions={<Button onClick={() => setForm(EMPTY)}><Plus className="h-4 w-4" /> New</Button>} />
      <div className="grid gap-3 md:grid-cols-2">
        {data.map((e) => (
          <Card key={e.id} variant="bento" className="flex gap-4">
            <span className="h-fit rounded-2xl bg-cyan-500/10 p-3 text-cyan-600 dark:text-cyan-400">{e.kind === 'GAME' ? <Gamepad2 className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{e.title}</p><Badge tone={e.kind === 'GAME' ? 'violet' : 'cyan'}>{e.kind}</Badge></div>
              <p className="text-sm text-slate-500">{e.description}</p>
              <p className="mt-1 text-xs text-slate-500">
                {e.kind === 'EVENT' ? `${e.startsAt ? formatDateTime(e.startsAt) : 'Date TBC'} · ${e._count.rsvps}/${e.capacity} RSVPs` : (
                  e.externalUrl && <a href={e.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-600">{e.externalUrl} <ExternalLink className="h-3 w-3" /></a>
                )}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => confirm(`Delete "${e.title}"?`) && remove.mutate(e.id)} aria-label={`Delete ${e.title}`}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
          </Card>
        ))}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title="Publish event or game">
        {form && (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Type">
              <select className="field" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as HubEvent['kind'] })}>
                <option value="EVENT">Physical hub event</option>
                <option value="GAME">Web game</option>
              </select>
            </Field>
            <Field label="Title"><input className="field" required minLength={2} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Description"><textarea className="field min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            {form.kind === 'EVENT' ? (
              <>
                <Field label="Starts at"><input className="field" type="datetime-local" required value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Location"><input className="field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
                  <Field label="Capacity"><input className="field" type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></Field>
                </div>
              </>
            ) : (
              <Field label="Launcher URL"><input className="field" type="url" required value={form.externalUrl} onChange={(e) => setForm({ ...form, externalUrl: e.target.value })} placeholder="https://" /></Field>
            )}
            <Button type="submit" className="w-full" loading={create.isPending}>Publish</Button>
          </form>
        )}
      </Modal>
    </>
  );
}
