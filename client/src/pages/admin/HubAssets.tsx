import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Field, Loading, Modal, PageHeader, StatusBadge, Tabs } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDateTime, naira } from '../../lib/format';
import { useSocketEvent } from '../../lib/socket';
import type { Booking, CatalogItem, Category } from '../../lib/types';
import { toast } from '../../store/toast';

type AdminBooking = Omit<Booking, 'item'> & { item: { name: string; category: Category }; user: { fullName: string } };
const CATEGORIES: Category[] = ['DESK', 'FACILITY', 'PROGRAM', 'HARDWARE', 'LOUNGE'];
const DEFAULT_UNIT: Record<Category, CatalogItem['unit']> = { DESK: 'hour', FACILITY: 'hour', PROGRAM: 'month', HARDWARE: 'day', LOUNGE: 'item' };

type Draft = Pick<CatalogItem, 'category' | 'name' | 'description' | 'price' | 'unit' | 'available'> & { id?: string; totalCapacity?: number };

function AssetForm({ draft, onDone }: { draft: Draft; onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(draft);
  const save = useMutation({
    mutationFn: () => {
      const { id, ...body } = form;
      return id ? api(`/admin/assets/${id}`, { method: 'PATCH', body }) : api('/admin/assets', { body });
    },
    onSuccess: () => {
      toast.success(form.id ? 'Asset updated' : 'Asset added');
      qc.invalidateQueries({ queryKey: ['admin', 'assets'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
      onDone();
    },
    onError: (e) => toast.error('Save failed', errorMessage(e)),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select className="field" value={form.category} onChange={(e) => { const c = e.target.value as Category; setForm({ ...form, category: c, unit: DEFAULT_UNIT[c] }); }}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Unit">
          <select className="field" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as CatalogItem['unit'] })}>
            {['hour', 'day', 'month', 'item'].map((u) => <option key={u}>{u}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Name"><input className="field" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Description"><input className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (₦)"><input className="field font-mono" type="number" min={0} required value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field>
        <Field label="Total Inventory / Capacity" hint="Number of units in the hub">
          <input className="field font-mono" type="number" min={0} max={10000} required value={form.totalCapacity ?? 10} onChange={(e) => setForm({ ...form, totalCapacity: Number(e.target.value) })} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} className="h-4 w-4 accent-cyan-500" /> Available to members</label>
      <Button type="submit" className="w-full" loading={save.isPending}>{form.id ? 'Save changes' : 'Add asset'}</Button>
    </form>
  );
}

export default function HubAssets() {
  const qc = useQueryClient();
  const [cat, setCat] = useState<Category>('FACILITY');
  const [editing, setEditing] = useState<Draft | null>(null);

  useSocketEvent('catalog:changed', () => {
    qc.invalidateQueries({ queryKey: ['admin', 'assets'] });
    qc.invalidateQueries({ queryKey: ['catalog'] });
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'assets'],
    queryFn: () => api<{ items: CatalogItem[]; bookings: AdminBooking[] }>('/admin/assets'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api<{ retired: boolean }>(`/admin/assets/${id}`, { method: 'DELETE' }),
    onSuccess: (r) => {
      toast.success(r.retired ? 'Asset retired' : 'Asset deleted', r.retired ? 'It has booking history, so it was hidden instead of deleted.' : undefined);
      qc.invalidateQueries({ queryKey: ['admin', 'assets'] });
    },
    onError: (e) => toast.error('Delete failed', errorMessage(e)),
  });

  if (isLoading || !data) return <Loading />;
  const items = data.items.filter((i) => i.category === cat);

  return (
    <>
      <PageHeader
        eyebrow="Hub Assets"
        title="Catalog & bookings"
        subtitle="Set prices and availability for everything members can book or order."
        actions={<Button onClick={() => setEditing({ category: cat, name: '', description: '', price: 0, unit: DEFAULT_UNIT[cat], totalCapacity: 10, available: true })}><Plus className="h-4 w-4" /> Add asset</Button>}
      />
      <Tabs
        value={cat}
        onChange={setCat}
        options={CATEGORIES.map((c) => ({
          value: c,
          label: c === 'HARDWARE' ? 'Hardware Rentals' : c.charAt(0) + c.slice(1).toLowerCase(),
        }))}
      />

      <Card variant="bento" className="mt-4 overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">Live Capacity & Status</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {items.map((i) => (
              <tr key={i.id}>
                <td className="px-5 py-3"><p className="font-semibold">{i.name}</p><p className="text-xs text-slate-500">{i.description}</p></td>
                <td className="px-5 py-3 font-mono">{naira(i.price)}/{i.unit}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {i.available ? (
                      <Badge tone={i.availableUnits !== undefined && i.availableUnits <= 0 ? 'amber' : 'green'}>
                        {i.availableUnits !== undefined && i.availableUnits <= 0 ? 'Full' : 'Available'}
                      </Badge>
                    ) : (
                      <Badge>Hidden</Badge>
                    )}
                    {i.availableUnits !== undefined && (
                      <span className="font-mono text-xs text-slate-500">
                        {i.availableUnits}/{i.maxCapacity ?? 10} available
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(i)} aria-label={`Edit ${i.name}`}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => confirm(`Remove ${i.name}?`) && remove.mutate(i.id)} aria-label={`Remove ${i.name}`}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">No assets in this category.</td></tr>}
          </tbody>
        </table>
      </Card>

      <h2 className="mb-3 mt-10 font-display text-lg font-bold">Open bookings</h2>
      <Card variant="bento" className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="px-5 py-3">Member</th><th className="px-5 py-3">Asset</th><th className="px-5 py-3">Qty</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Session</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {data.bookings.map((b) => (
              <tr key={b.id}>
                <td className="px-5 py-3 font-medium">{b.user.fullName}</td>
                <td className="px-5 py-3">{b.item.name}</td>
                <td className="px-5 py-3">{b.quantity}</td>
                <td className="px-5 py-3 font-mono">{naira(b.amount)}</td>
                <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                <td className="px-5 py-3 text-xs text-slate-500">{b.endsAt ? `until ${formatDateTime(b.endsAt)}` : '—'}</td>
              </tr>
            ))}
            {data.bookings.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No open bookings.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? `Edit ${editing.name}` : 'Add asset'}>
        {editing && <AssetForm key={editing.id ?? 'new'} draft={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
