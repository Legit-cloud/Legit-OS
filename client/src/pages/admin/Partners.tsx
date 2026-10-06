import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Handshake, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Empty, Field, Loading, Modal, PageHeader } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import type { Partner } from '../../lib/types';
import { toast } from '../../store/toast';

const EMPTY = { name: '', category: 'Investor', website: '', description: '' };

export default function Partners() {
  const qc = useQueryClient();
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'partners'], queryFn: () => api<Partner[]>('/admin/partners') });
  const create = useMutation({
    mutationFn: (body: typeof EMPTY) => api('/admin/partners', { body }),
    onSuccess: () => {
      toast.success('Partner added');
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin', 'partners'] });
    },
    onError: (e) => toast.error('Could not add partner', errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/partners/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'partners'] }),
  });

  if (isLoading || !data) return <Loading />;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form) create.mutate(form);
  };

  return (
    <>
      <PageHeader eyebrow="Partner Network" title="Partners" subtitle="Investors, corporates, government and academic partners." actions={<Button onClick={() => setForm(EMPTY)}><Plus className="h-4 w-4" /> Add partner</Button>} />
      {data.length === 0 ? <Card><Empty icon={<Handshake className="h-10 w-10" />} title="No partners yet" /></Card> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <Badge tone="cyan">{p.category}</Badge>
                <Button size="sm" variant="ghost" onClick={() => confirm(`Remove ${p.name}?`) && remove.mutate(p.id)} aria-label={`Remove ${p.name}`}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
              </div>
              <p className="mt-2 font-display text-lg font-bold">{p.name}</p>
              <p className="text-sm text-slate-500">{p.description}</p>
              {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-cyan-600">Website <ExternalLink className="h-3 w-3" /></a>}
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title="Add partner">
        {form && (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Name"><input className="field" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Category">
              <select className="field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {['Investor', 'Corporate', 'Government', 'Academic', 'Technology', 'Community'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Website"><input className="field" type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" /></Field>
            <Field label="Description"><textarea className="field min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Button type="submit" className="w-full" loading={create.isPending}>Add partner</Button>
          </form>
        )}
      </Modal>
    </>
  );
}
