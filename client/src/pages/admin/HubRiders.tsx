import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Field, Loading, Modal, PageHeader, StatusBadge } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { naira, timeAgo } from '../../lib/format';
import type { Rider, TransitRequest, Vehicle } from '../../lib/types';
import { toast } from '../../store/toast';

type AdminRide = TransitRequest & { user: { fullName: string; phone: string | null } };

export default function HubRiders() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', vehicleType: 'Bike' as Vehicle, plate: '' });
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'riders'],
    queryFn: () => api<{ riders: Rider[]; rides: AdminRide[] }>('/admin/riders'),
    refetchInterval: 20_000,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin'] });
  const onError = (e: unknown) => toast.error('Action failed', errorMessage(e));

  const assign = useMutation({
    mutationFn: ({ rideId, riderId }: { rideId: string; riderId: string }) => api(`/admin/transit/${rideId}/assign`, { body: { riderId } }),
    onSuccess: () => { toast.success('Rider dispatched'); refresh(); },
    onError,
  });
  const setStatus = useMutation({
    mutationFn: ({ rideId, status }: { rideId: string; status: string }) => api(`/admin/transit/${rideId}`, { method: 'PATCH', body: { status } }),
    onSuccess: refresh,
    onError,
  });
  const addRider = useMutation({
    mutationFn: () => api('/admin/riders', { body: form }),
    onSuccess: () => { toast.success('Rider onboarded'); setAdding(false); setForm({ name: '', phone: '', vehicleType: 'Bike', plate: '' }); refresh(); },
    onError,
  });
  const toggleRider = useMutation({
    mutationFn: (r: Rider) => api(`/admin/riders/${r.id}`, { method: 'PATCH', body: { available: !r.available } }),
    onSuccess: refresh,
    onError,
  });
  const removeRider = useMutation({
    mutationFn: (id: string) => api(`/admin/riders/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError,
  });

  if (isLoading || !data) return <Loading />;
  const live = data.rides.filter((r) => ['REQUESTED', 'ASSIGNED', 'EN_ROUTE'].includes(r.status));
  const past = data.rides.filter((r) => !live.includes(r));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    addRider.mutate();
  };

  return (
    <>
      <PageHeader eyebrow="Hub Riders" title="Transit dispatch" subtitle="Assign riders to incoming requests and track trips." actions={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add rider</Button>} />

      <h2 className="mb-3 font-display text-lg font-bold">Live requests ({live.length})</h2>
      {live.length === 0 ? (
        <Card className="text-center text-sm text-slate-500">No rides awaiting dispatch.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {live.map((r) => {
            const candidates = data.riders.filter((x) => x.available || x.id === r.rider?.id);
            return (
              <Card key={r.id} variant="bento">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{r.user.fullName}</p>
                    <p className="text-sm text-slate-500">{r.pickupLocation} → {r.dropoffLocation}</p>
                    <p className="mt-1 text-xs text-slate-500">{r.vehicleType} · {naira(r.fareEstimate)} · {timeAgo(r.createdAt)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                {r.user.phone && <a href={`tel:${r.user.phone}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-600"><Phone className="h-3 w-3" /> {r.user.phone}</a>}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {r.status !== 'EN_ROUTE' && (
                    <select
                      className="field w-auto flex-1 py-2"
                      value={r.rider?.id ?? ''}
                      onChange={(e) => e.target.value && assign.mutate({ rideId: r.id, riderId: e.target.value })}
                      aria-label="Assign rider"
                    >
                      <option value="">Assign rider…</option>
                      {candidates.map((x) => (
                        <option key={x.id} value={x.id}>{x.name} · {x.vehicleType}{x.vehicleType !== r.vehicleType ? ' (different vehicle)' : ''}</option>
                      ))}
                    </select>
                  )}
                  {r.status === 'ASSIGNED' && <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ rideId: r.id, status: 'EN_ROUTE' })}>Picked up</Button>}
                  {r.status === 'EN_ROUTE' && <Button size="sm" variant="success" onClick={() => setStatus.mutate({ rideId: r.id, status: 'COMPLETED' })}>Complete</Button>}
                  <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ rideId: r.id, status: 'CANCELLED' })}>Cancel</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 mt-10 font-display text-lg font-bold">Rider fleet</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.riders.map((r) => (
          <Card key={r.id} variant="bento">
            <div className="flex items-center justify-between">
              <Badge tone="cyan">{r.vehicleType}</Badge>
              {r.available ? <Badge tone="green">Available</Badge> : <Badge tone="amber">Busy / off</Badge>}
            </div>
            <p className="mt-3 font-semibold">{r.name}</p>
            <p className="text-sm text-slate-500">{r.phone}</p>
            <p className="font-mono text-xs text-slate-500">{r.plate}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toggleRider.mutate(r)}>{r.available ? 'Set off-duty' : 'Set available'}</Button>
              <Button size="sm" variant="ghost" onClick={() => confirm(`Remove ${r.name}?`) && removeRider.mutate(r.id)} aria-label={`Remove ${r.name}`}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
            </div>
          </Card>
        ))}
      </div>

      {past.length > 0 && (
        <Card variant="bento" className="mt-10 overflow-x-auto">
          <h2 className="font-display text-lg font-bold">Trip history</h2>
          <table className="mt-3 w-full min-w-[560px] text-left text-sm">
            <tbody className="divide-y divide-slate-200">
              {past.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 font-medium">{r.user.fullName}</td>
                  <td className="py-2.5 text-slate-500">{r.pickupLocation}</td>
                  <td className="py-2.5">{r.vehicleType}</td>
                  <td className="py-2.5">{r.rider?.name ?? '—'}</td>
                  <td className="py-2.5"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Onboard rider">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Name"><input className="field" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone"><input className="field" required minLength={5} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vehicle">
              <select className="field" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value as Vehicle })}>
                {['Bike', 'Keke', 'Cab'].map((v) => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Plate"><input className="field" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} /></Field>
          </div>
          <Button type="submit" className="w-full" loading={addRider.isPending}>Add rider</Button>
        </form>
      </Modal>
    </>
  );
}
