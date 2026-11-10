import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Laptop, Plus, Pencil, Trash2, CheckCircle2, EyeOff, Search,
  MonitorCheck, Clock
} from 'lucide-react';
import {
  Badge, Button, Card, Field, Loading, Modal, PageHeader,
  StatCard, StatusBadge, Empty
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDateTime, naira } from '../../lib/format';
import { useSocketEvent } from '../../lib/socket';
import type { Booking, CatalogItem, Category } from '../../lib/types';
import { toast } from '../../store/toast';

type AdminBooking = Omit<Booking, 'item'> & {
  item: { name: string; category: Category };
  user: { fullName: string };
};

type HardwareDraft = {
  id?: string;
  category: Category;
  name: string;
  description: string;
  price: number;
  unit: CatalogItem['unit'];
  totalCapacity?: number;
  available: boolean;
};

function HardwareModalForm({ draft, onDone }: { draft: HardwareDraft; onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(draft);

  const save = useMutation({
    mutationFn: () => {
      const { id, ...body } = form;
      return id ? api(`/admin/assets/${id}`, { method: 'PATCH', body }) : api('/admin/assets', { body });
    },
    onSuccess: () => {
      toast.success(form.id ? 'Hardware rental updated' : 'New workstation added');
      qc.invalidateQueries({ queryKey: ['admin', 'assets'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
      onDone();
    },
    onError: (e) => toast.error('Failed to save hardware', errorMessage(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Workstation / Laptop Model Name" hint="e.g. HP ZBook Fury 16, Lenovo ThinkPad P-Series">
        <input
          className="field"
          required
          minLength={2}
          placeholder="e.g. HP ZBook Workstation"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </Field>

      <Field label="Specifications & Hardware Details" hint="CPU, RAM, GPU, Storage specs displayed to members">
        <textarea
          className="field resize-none h-24"
          required
          placeholder="e.g. Intel Core i7-13800H, 32GB RAM, NVIDIA RTX 4060, 1TB NVMe SSD"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Rental Price (₦)" hint="Rental rate">
          <input
            className="field font-mono"
            type="number"
            min={0}
            step={500}
            required
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          />
        </Field>

        <Field label="Total Inventory" hint="Units in fleet">
          <input
            className="field font-mono"
            type="number"
            min={0}
            max={1000}
            required
            value={form.totalCapacity ?? 10}
            onChange={(e) => setForm({ ...form, totalCapacity: Number(e.target.value) })}
          />
        </Field>

        <Field label="Billing Interval">
          <select
            className="field"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value as CatalogItem['unit'] })}
          >
            <option value="day">per day (standard)</option>
            <option value="hour">per hour</option>
            <option value="month">per month</option>
          </select>
        </Field>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.available}
            onChange={(e) => setForm({ ...form, available: e.target.checked })}
            className="mt-1 h-4 w-4 rounded accent-cyan-500"
          />
          <div>
            <span className="block text-sm font-semibold text-slate-800">
              Available to rent
            </span>
            <span className="block text-xs text-slate-500">
              When checked, this workstation will be live on member terminals under Infrastructure → Hardware Rentals.
            </span>
          </div>
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={save.isPending}>
          {form.id ? 'Save changes' : 'Add to fleet'}
        </Button>
      </div>
    </form>
  );
}

export default function HardwareRentals() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<HardwareDraft | null>(null);

  // Live real-time sync with database & other sessions
  useSocketEvent('catalog:changed', () => {
    qc.invalidateQueries({ queryKey: ['admin', 'assets'] });
    qc.invalidateQueries({ queryKey: ['catalog'] });
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'assets'],
    queryFn: () => api<{ items: CatalogItem[]; bookings: AdminBooking[] }>('/admin/assets'),
  });

  const toggleAvailability = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      api(`/admin/assets/${id}`, { method: 'PATCH', body: { available } }),
    onSuccess: (_, vars) => {
      toast.success(vars.available ? 'Workstation set to Available' : 'Workstation hidden from users');
      qc.invalidateQueries({ queryKey: ['admin', 'assets'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
    onError: (e) => toast.error('Failed to toggle status', errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api<{ retired: boolean }>(`/admin/assets/${id}`, { method: 'DELETE' }),
    onSuccess: (r) => {
      toast.success(
        r.retired ? 'Workstation retired' : 'Workstation deleted',
        r.retired ? 'It has rental booking history, so it was retired instead of deleted.' : undefined,
      );
      qc.invalidateQueries({ queryKey: ['admin', 'assets'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
    onError: (e) => toast.error('Delete failed', errorMessage(e)),
  });

  const handover = useMutation({
    mutationFn: (id: string) => api<{ endsAt?: string }>(`/admin/hardware/${id}/handover`, { method: 'POST' }),
    onSuccess: (data) => {
      toast.success('Workstation Handed Over', `Rental started. Return due: ${data.endsAt ? formatDateTime(data.endsAt) : ''}`);
      qc.invalidateQueries({ queryKey: ['admin', 'assets'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
    onError: (e) => toast.error('Handover failed', errorMessage(e)),
  });

  const markReturn = useMutation({
    mutationFn: (id: string) => api(`/admin/hardware/${id}/return`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Workstation Returned', 'Device successfully checked back into fleet inventory.');
      qc.invalidateQueries({ queryKey: ['admin', 'assets'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
    onError: (e) => toast.error('Return failed', errorMessage(e)),
  });

  if (isLoading || !data) return <Loading label="Loading hardware inventory…" />;

  const hardwareItems = data.items.filter((i) => i.category === 'HARDWARE');
  const hardwareBookings = data.bookings.filter((b) => b.item.category === 'HARDWARE');

  const filteredHardware = hardwareItems.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.description.toLowerCase().includes(search.toLowerCase()),
  );

  const availableCount = hardwareItems.filter((i) => i.available).length;
  const hiddenCount = hardwareItems.filter((i) => !i.available).length;

  return (
    <>
      <PageHeader
        eyebrow="Hardware Fleet"
        title="Hardware Rentals"
        subtitle="Manage workstations, laptops, daily rates and availability reflected directly on the member terminal."
        actions={
          <Button
            onClick={() =>
              setEditing({
                category: 'HARDWARE',
                name: '',
                description: '',
                price: 5000,
                unit: 'day',
                totalCapacity: 5,
                available: true,
              })
            }
          >
            <Plus className="h-4 w-4" /> Add Workstation
          </Button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Laptop className="h-5 w-5" />}
          label="Total Fleet"
          value={hardwareItems.length}
          hint="Configured workstations"
        />
        <StatCard
          icon={<MonitorCheck className="h-5 w-5" />}
          label="Available to Rent"
          value={availableCount}
          hint="Visible to members"
        />
        <StatCard
          icon={<EyeOff className="h-5 w-5" />}
          label="Hidden / Reserved"
          value={hiddenCount}
          hint="Not listed on member app"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Active Bookings"
          value={hardwareBookings.length}
          hint="Pending or active rentals"
        />
      </div>

      {/* Search & Actions Bar */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search workstation name or specs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field rounded-full pl-10 text-sm"
          />
        </div>
        <p className="text-xs text-slate-500 font-mono">
          <span className="text-blue-600">●</span> Syncs live with member terminal under <strong className="text-slate-700">Infrastructure → Hardware Rentals</strong>.
        </p>
      </div>

      {/* Fleet Cards Grid */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredHardware.map((h) => (
          <Card key={h.id} variant="bento" className="relative flex flex-col justify-between overflow-hidden transition-all hover:border-blue-500/50">
            <div>
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-600">
                  <Laptop className="h-6 w-6" />
                </span>
                <button
                  type="button"
                  onClick={() => toggleAvailability.mutate({ id: h.id, available: !h.available })}
                  title={h.available ? 'Click to hide from users' : 'Click to make available to users'}
                  className="transition hover:scale-105"
                >
                  {h.available ? (
                    <Badge tone="green" className="cursor-pointer gap-1.5 py-1">
                      <CheckCircle2 className="h-3 w-3" /> Available
                    </Badge>
                  ) : (
                    <Badge tone="slate" className="cursor-pointer gap-1.5 py-1">
                      <EyeOff className="h-3 w-3" /> Hidden
                    </Badge>
                  )}
                </button>
              </div>

              <div className="mt-4">
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {h.name}
                </h3>
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600 font-mono">
                  {h.description || 'No specs entered.'}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <div className="flex items-baseline justify-between">
                <p className="font-display text-xl font-bold text-slate-900">
                  {naira(h.price)}
                  <span className="text-xs font-normal text-slate-500">/{h.unit}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(h)}
                    aria-label={`Edit ${h.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => confirm(`Remove ${h.name} from rental fleet?`) && remove.mutate(h.id)}
                    aria-label={`Remove ${h.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filteredHardware.length === 0 && (
          <div className="col-span-full">
            <Empty
              icon={<Laptop className="h-10 w-10 text-slate-400" />}
              title="No workstations found"
              hint={search ? 'Try clearing your search query.' : 'Click "Add Workstation" above to add your first rentable device.'}
            />
          </div>
        )}
      </div>

      {/* Active Hardware Rental Sessions & Bookings */}
      <h2 className="mb-3 mt-12 font-display text-lg font-bold">
        Hardware Rental Bookings
      </h2>
      <Card variant="bento" className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Member</th>
              <th className="px-5 py-3">Workstation</th>
              <th className="px-5 py-3">Days / Qty</th>
              <th className="px-5 py-3">Total Amount</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Duration / Return Due</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {hardwareBookings.map((b) => (
              <tr key={b.id}>
                <td className="px-5 py-3 font-medium">{b.user.fullName}</td>
                <td className="px-5 py-3 flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-cyan-500 shrink-0" />
                  <span>{b.item.name}</span>
                </td>
                <td className="px-5 py-3">{b.quantity} day{b.quantity > 1 ? 's' : ''}</td>
                <td className="px-5 py-3 font-mono">{naira(b.amount)}</td>
                <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                <td className="px-5 py-3 text-xs text-slate-500">
                  {b.status === 'CONFIRMED' ? (
                    <span className="font-semibold text-amber-600">
                      ● Awaiting Handover at Desk
                    </span>
                  ) : b.status === 'ACTIVE' && b.endsAt ? (
                    <span className="font-semibold text-cyan-600">
                      Due: {formatDateTime(b.endsAt)}
                    </span>
                  ) : b.status === 'COMPLETED' ? (
                    <span className="text-slate-400">Returned</span>
                  ) : (
                    <span>{b.endsAt ? `until ${formatDateTime(b.endsAt)}` : '—'}</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {b.status === 'CONFIRMED' && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handover.mutate(b.id)}
                      loading={handover.isPending}
                      className="gap-1.5 whitespace-nowrap"
                    >
                      <Laptop className="h-3.5 w-3.5" />
                      <span>Hand Over</span>
                    </Button>
                  )}
                  {b.status === 'ACTIVE' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markReturn.mutate(b.id)}
                      loading={markReturn.isPending}
                      className="gap-1.5 whitespace-nowrap text-emerald-600 border-emerald-500/30 hover:bg-emerald-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Mark Returned</span>
                    </Button>
                  )}
                  {b.status === 'COMPLETED' && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Returned
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {hardwareBookings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                  No active or pending hardware rentals.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Edit / Add Modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit ${editing.name}` : 'Add Workstation to Fleet'}
      >
        {editing && (
          <HardwareModalForm
            key={editing.id ?? 'new-hardware'}
            draft={editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </>
  );
}
