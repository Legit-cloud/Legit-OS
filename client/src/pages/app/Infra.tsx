import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Armchair, Building2, Clapperboard, Clock, Laptop, Minus, Plus, Presentation, School, ShoppingBag, Sparkles, UtensilsCrossed, DoorClosed,
} from 'lucide-react';
import { Badge, Button, Card, Empty, Field, Loading, Modal, PageHeader, StatusBadge, cn } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useSocketEvent } from '../../lib/socket';
import { formatDateTime, naira } from '../../lib/format';
import type { Booking, CatalogItem, Invoice, LoungeOrder } from '../../lib/types';
import { toast } from '../../store/toast';

const FACILITY_ICONS: Record<string, typeof Building2> = {
  'Media Studio': Clapperboard,
  'Private Office': DoorClosed,
  'Conference Room': Presentation,
  Classroom: School,
};

const FACILITY_PHOTOS: Record<string, string> = {
  'Media Studio': 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80',
  'Private Office': 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
  'Conference Room': 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80',
  Classroom: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
};

const DESK_PHOTO = 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80';

function Section({ title, subtitle, children }: { title: React.ReactNode; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="mb-4 text-sm text-slate-500">{subtitle}</p>
      {children}
    </section>
  );
}

function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
  unit,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
  unit?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 p-1 shadow-sm dark:border-white/10 dark:bg-slate-900/60" aria-label={label}>
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        aria-label={`Decrease ${label}`}
        title={unit ? `Decrease by 1 ${unit}` : `Decrease ${label}`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      <span className="min-w-14 px-2 text-center font-mono text-xs sm:text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100 whitespace-nowrap">
        {value} {unit ? `${unit}${value > 1 && !unit.endsWith('s') ? 's' : ''}` : ''}
      </span>

      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        aria-label={`Increase ${label}`}
        title={unit ? `Increase by 1 ${unit}` : `Increase ${label}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function useBook() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (v: { itemId: string; quantity: number }) => api<{ booking: Booking; invoice: Invoice }>('/bookings', { body: v }),
    onSuccess: ({ invoice }) => {
      toast.success('Booking created', 'Complete payment by bank transfer to confirm it.');
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['finance'] });
      navigate(`/app/finance?invoice=${invoice.id}`);
    },
    onError: (e) => toast.error('Booking failed', errorMessage(e)),
  });
}

function BookModal({ item, onClose }: { item: CatalogItem | null; onClose: () => void }) {
  const [qty, setQty] = useState(1);
  const book = useBook();
  if (!item) return <Modal open={false} onClose={onClose} title="">{null}</Modal>;
  const max = item.unit === 'hour' ? 12 : item.unit === 'day' ? 30 : 12;
  const isAvailable = item.availableUnits === undefined || item.availableUnits > 0;
  return (
    <Modal open onClose={onClose} title={`Book ${item.name}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">{item.description}</p>
        {item.availableUnits !== undefined && (
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
            isAvailable ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', isAvailable ? 'bg-emerald-500' : 'bg-rose-500')} />
            {isAvailable ? `${item.availableUnits} of ${item.maxCapacity ?? 10} available` : 'Fully booked'}
          </span>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold block">Select duration:</span>
          <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
            (+1 {item.unit} per click)
          </span>
        </div>
        <Stepper value={qty} onChange={setQty} max={max} label={`${item.unit}s`} unit={item.unit} />
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-cyan-500/10 px-4 py-3">
        <span className="text-sm">{naira(item.price)} × {qty} {item.unit}{qty > 1 ? 's' : ''}</span>
        <span className="font-display text-xl font-bold">{naira(item.price * qty)}</span>
      </div>
      <Button className="mt-5 w-full" disabled={!isAvailable} loading={book.isPending} onClick={() => book.mutate({ itemId: item.id, quantity: qty })}>
        {isAvailable ? 'Book & proceed to payment' : 'Currently fully booked'}
      </Button>
    </Modal>
  );
}

function CoWorkspace({ desks }: { desks: CatalogItem[] }) {
  const [mode, setMode] = useState<'hour' | 'day'>('hour');
  const [qty, setQty] = useState(2);
  const book = useBook();
  const desk = desks.find((d) => d.unit === mode) ?? desks[0];
  if (!desk) return <Empty title="No desks available right now" />;
  const isAvailable = desk.availableUnits === undefined || desk.availableUnits > 0;

  return (
    <Card variant="bento" className="overflow-hidden p-0 sm:p-0">
      <div className="grid lg:grid-cols-12 gap-0">
        <div className="relative lg:col-span-5 h-56 sm:h-64 lg:h-auto min-h-[220px] overflow-hidden">
          <img
            src={DESK_PHOTO}
            alt="Ergonomic Hot Desks at L.E.G.I.T Innovation Hub"
            className="h-full w-full object-cover object-center"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-slate-950/90" />
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white">
              ⚡ 1 Gbps Fiber
            </span>
            <span className="rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white">
              🔋 24/7 Redundant Power
            </span>
            <span className="rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white">
              🪑 Ergonomic Seating
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:col-span-7 flex flex-col justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-full border border-slate-200 p-1 dark:border-white/10 bg-slate-100/50 dark:bg-white/5" role="radiogroup" aria-label="Desk plan">
                {(['hour', 'day'] as const).filter((m) => desks.some((d) => d.unit === m)).map((m) => (
                  <button
                    key={m}
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => { setMode(m); setQty(m === 'hour' ? 2 : 1); }}
                    className={cn(
                      'rounded-full px-5 py-2 text-xs sm:text-sm font-semibold transition',
                      mode === m ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    )}
                  >
                    {m === 'hour' ? 'Hourly rate' : 'Day pass'}
                  </button>
                ))}
              </div>

              {desk.availableUnits !== undefined && (
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                  isAvailable ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                )}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500')} />
                  {isAvailable ? `${desk.availableUnits} of ${desk.maxCapacity ?? 10} desks open` : 'Fully booked'}
                </span>
              )}
            </div>

            <div className="mt-5 flex items-start gap-4">
              <span className="rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 p-3 shrink-0">
                <Armchair className="h-6 w-6" />
              </span>
              <div>
                <p className="font-display text-xl font-bold text-slate-900 dark:text-white">{desk.name}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desk.description}</p>
                <p className="mt-2 font-mono text-lg font-bold text-blue-600 dark:text-blue-400">
                  {naira(desk.price)} <span className="font-sans text-xs font-normal text-slate-400">/ {desk.unit}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Select duration</span>
              <Stepper
                value={qty}
                onChange={setQty}
                max={mode === 'hour' ? 12 : 30}
                label={`${mode}s`}
                unit={mode === 'hour' ? 'hr' : 'day'}
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-5">
              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-400 font-medium font-mono">
                  {naira(desk.price)} × {qty} {mode === 'hour' ? 'hr' : 'day'}{qty > 1 ? 's' : ''}
                </p>
                <p className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                  {naira(desk.price * qty)}
                </p>
              </div>

              <Button
                disabled={!isAvailable}
                loading={book.isPending}
                onClick={() => book.mutate({ itemId: desk.id, quantity: qty })}
                className="px-6 py-2.5"
              >
                {isAvailable ? 'Reserve desk' : 'Fully booked'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Set to true to display the Coming Soon status on the user end while preserving all underlying code.
const LOUNGE_COMING_SOON = true;

function LoungeComingSoonCover() {
  return (
    <Card className="relative overflow-hidden p-8 sm:p-12 text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-blue-500/5 pointer-events-none" />
      <div className="relative mx-auto max-w-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 shadow-inner">
          <UtensilsCrossed className="h-8 w-8" />
        </div>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <Clock className="h-3.5 w-3.5" />
          <span>Coming Soon · Kitchen Setup In Progress</span>
        </div>

        <h3 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Cafeteria & Desk-Side Refreshments
        </h3>
        <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-400">
          Enjoy gourmet meals, snacks, and freshly brewed artisan coffee delivered straight to your hot desk, private office, or studio without leaving your workflow.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3 text-left">
          <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <p className="font-semibold text-slate-900 dark:text-white text-sm">⚡ Desk-Side Delivery</p>
            <p className="mt-1 text-xs text-slate-500 leading-normal">Tagged to your desk number so you can stay in flow while food comes to you.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <p className="font-semibold text-slate-900 dark:text-white text-sm">☕ Barista & Snacks</p>
            <p className="mt-1 text-xs text-slate-500 leading-normal">Espresso, healthy bites, cold brews, and fresh lunch specials every day.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <p className="font-semibold text-slate-900 dark:text-white text-sm">💳 Cashless Billing</p>
            <p className="mt-1 text-xs text-slate-500 leading-normal">Seamless checkout via wallet, bank transfer, and automated hub invoicing.</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>The kitchen team is currently finalizing menu pricing and supplier prep. Ordering will unlock here automatically soon.</span>
        </div>
      </div>
    </Card>
  );
}

function Lounge({ menu }: { menu: CatalogItem[] }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customItem, setCustomItem] = useState('');
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const orders = useQuery({ queryKey: ['lounge'], queryFn: () => api<LoungeOrder[]>('/lounge/orders') });

  const lines = menu.filter((m) => cart[m.id]).map((m) => ({ item: m, qty: cart[m.id] }));
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const setQty = (id: string, q: number) => setCart(({ [id]: _drop, ...rest }) => (q > 0 ? { ...rest, [id]: q } : rest));

  const submit = useMutation({
    mutationFn: () =>
      api<{ order: LoungeOrder; invoice: Invoice | null }>('/lounge/orders', {
        body: { items: lines.map((l) => ({ itemId: l.item.id, qty: l.qty })), customItem: customItem || undefined, notes: notes || undefined },
      }),
    onSuccess: ({ invoice }) => {
      setCart({});
      setCustomItem('');
      setNotes('');
      setConfirming(false);
      qc.invalidateQueries({ queryKey: ['lounge'] });
      qc.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Order sent to the lounge', invoice ? 'Pay by transfer to start preparation.' : 'The counter will price your custom item.');
      if (invoice) navigate(`/app/finance?invoice=${invoice.id}`);
    },
    onError: (e) => toast.error('Order failed', errorMessage(e)),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="grid gap-3 sm:grid-cols-2">
        {menu.map((m) => (
          <Card key={m.id} className="flex items-center justify-between gap-3 p-4 sm:p-4">
            <div className="min-w-0">
              <p className="font-semibold">{m.name}</p>
              <p className="truncate text-xs text-slate-500">{m.description}</p>
              <p className="mt-1 text-sm font-semibold text-cyan-600 dark:text-cyan-400">{naira(m.price)}</p>
            </div>
            {cart[m.id] ? (
              <Stepper value={cart[m.id]} onChange={(q) => setQty(m.id, q)} min={0} max={20} label={m.name} />
            ) : (
              <Button size="sm" variant="outline" onClick={() => setQty(m.id, 1)}><Plus className="h-3.5 w-3.5" /> Add</Button>
            )}
          </Card>
        ))}
      </div>

      <Card className="h-fit">
        <p className="flex items-center gap-2 font-display font-bold"><ShoppingBag className="h-5 w-5 text-cyan-500" /> Your order</p>
        <div className="mt-4 space-y-2 text-sm">
          {lines.length === 0 && !customItem && <p className="text-slate-500">Add items from the menu.</p>}
          {lines.map((l) => (
            <div key={l.item.id} className="flex justify-between"><span>{l.qty}× {l.item.name}</span><span>{naira(l.item.price * l.qty)}</span></div>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Custom item" hint="Not on the menu? Ask the counter — it's priced on pickup.">
            <input className="field" value={customItem} maxLength={120} onChange={(e) => setCustomItem(e.target.value)} placeholder="e.g. Jollof rice, no pepper" />
          </Field>
          <Field label="Notes for the kitchen">
            <input className="field" value={notes} maxLength={240} onChange={(e) => setNotes(e.target.value)} placeholder="Desk 14, extra ketchup…" />
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-white/10">
          <span className="text-sm text-slate-500">Total</span>
          <span className="font-display text-xl font-bold">{naira(total)}</span>
        </div>
        <Button className="mt-4 w-full" disabled={lines.length === 0 && !customItem.trim()} onClick={() => setConfirming(true)}>
          <UtensilsCrossed className="h-4 w-4" /> Review order
        </Button>

        {!!orders.data?.length && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recent orders</p>
            <ul className="mt-2 space-y-2">
              {orders.data.slice(0, 4).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-slate-500">{formatDateTime(o.createdAt)} · {naira(o.total)}</span>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Confirm lounge order">
        <ul className="space-y-2 text-sm">
          {lines.map((l) => (
            <li key={l.item.id} className="flex justify-between"><span>{l.qty}× {l.item.name}</span><span>{naira(l.item.price * l.qty)}</span></li>
          ))}
          {customItem && <li className="flex justify-between text-slate-500"><span>1× {customItem} (custom)</span><span>priced at counter</span></li>}
        </ul>
        {notes && <p className="mt-3 rounded-2xl bg-slate-100 px-3 py-2 text-sm dark:bg-white/5">Note: {notes}</p>}
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-cyan-500/10 px-4 py-3">
          <span className="text-sm">Total due now</span>
          <span className="font-display text-xl font-bold">{naira(total)}</span>
        </div>
        <Button className="mt-5 w-full" loading={submit.isPending} onClick={() => submit.mutate()}>Submit order</Button>
      </Modal>
    </div>
  );
}

export default function Infra() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: () => api<CatalogItem[]>('/catalog') });
  const bookings = useQuery({ queryKey: ['bookings'], queryFn: () => api<Booking[]>('/bookings') });
  const finance = useQuery({ queryKey: ['finance'], queryFn: () => api<{ invoices: Invoice[] }>('/finance') });
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const book = useBook();

  useSocketEvent('catalog:changed', () => {
    qc.invalidateQueries({ queryKey: ['catalog'] });
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api(`/bookings/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Booking cancelled');
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['finance'] });
    },
    onError: (e) => toast.error('Could not cancel', errorMessage(e)),
  });

  const by = useMemo(() => {
    const groups: Record<string, CatalogItem[]> = {};
    for (const item of catalog.data ?? []) (groups[item.category] ??= []).push(item);
    return groups;
  }, [catalog.data]);

  if (catalog.isLoading) return <Loading />;
  const invoiceFor = (bookingId: string) => finance.data?.invoices.find((i) => i.refId === bookingId && i.status === 'PENDING');
  const openBookings = (bookings.data ?? []).filter((b) => ['PENDING_PAYMENT', 'CONFIRMED', 'ACTIVE'].includes(b.status));

  return (
    <>
      <PageHeader eyebrow="Infra" title="Infrastructure" subtitle="Book workspace, facilities and hardware — lounge orders and cafeteria coming soon." />

      {openBookings.length > 0 && (
        <Card className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">My open bookings</p>
          <ul className="divide-y divide-slate-200 dark:divide-white/10">
            {openBookings.map((b) => {
              const invoice = invoiceFor(b.id);
              return (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">{b.item.name} · {b.quantity} {b.item.unit}{b.quantity > 1 ? 's' : ''}</p>
                    <p className="text-xs text-slate-500">{naira(b.amount)} · booked {formatDateTime(b.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={b.status} />
                    {invoice && <Button size="sm" onClick={() => navigate(`/app/finance?invoice=${invoice.id}`)}>Pay</Button>}
                    {b.status === 'PENDING_PAYMENT' && invoice && (
                      <Button size="sm" variant="ghost" loading={cancel.isPending && cancel.variables === b.id} onClick={() => cancel.mutate(b.id)}>Cancel</Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Section title="Co-Workspace Area" subtitle="Flexible desks with fibre, power backup and lounge access.">
        <CoWorkspace desks={by.DESK ?? []} />
      </Section>

      <Section title="Private Facilities" subtitle="Bookable by the hour. Paid bookings can be checked in from your Overview.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(by.FACILITY ?? []).map((f) => {
            const Icon = FACILITY_ICONS[f.name] ?? Building2;
            const isFull = f.availableUnits !== undefined && f.availableUnits <= 0;
            const photo = FACILITY_PHOTOS[f.name] ?? DESK_PHOTO;
            return (
              <Card key={f.id} variant="bento" className="flex flex-col overflow-hidden p-0 sm:p-0 group">
                <div className="relative h-40 w-full overflow-hidden bg-slate-900">
                  <img
                    src={photo}
                    alt={f.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="w-fit rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 p-2 text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    {f.availableUnits !== undefined && (
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md',
                        !isFull
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                      )}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', !isFull ? 'bg-emerald-400' : 'bg-rose-400')} />
                        {!isFull ? `${f.availableUnits} open` : 'Booked'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <p className="font-display text-lg font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {f.name}
                  </p>
                  <p className="mt-1 flex-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {f.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                    <p className="font-mono text-base font-bold text-slate-900 dark:text-white">
                      {naira(f.price)} <span className="font-sans text-xs font-normal text-slate-400">/{f.unit}</span>
                    </p>
                    <Button
                      size="sm"
                      disabled={isFull}
                      onClick={() => setSelected(f)}
                    >
                      {isFull ? 'Fully booked' : 'Book space'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section title="Hub Programs" subtitle="Monthly program subscriptions for founders and builders.">
        <div className="grid gap-4 md:grid-cols-2">
          {(by.PROGRAM ?? []).map((p) => (
            <Card key={p.id} variant="bento" className="relative overflow-hidden group">
              <Sparkles className="absolute -right-3 -top-3 h-28 w-28 text-cyan-500/10 pointer-events-none transition group-hover:scale-110 group-hover:text-cyan-500/20" />
              <Badge tone="cyan">Incubation & Residency</Badge>
              <p className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">{p.name}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{p.description}</p>
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                <p className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                  {naira(p.price)}<span className="font-sans text-xs font-normal text-slate-400"> /month</span>
                </p>
                <Button
                  loading={book.isPending && book.variables?.itemId === p.id}
                  onClick={() => book.mutate({ itemId: p.id, quantity: 1 })}
                >
                  Join Residency
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Hardware Rentals" subtitle="Rent high-spec workstations and laptops for your projects.">
        <Card variant="bento" className="p-0 sm:p-0 overflow-hidden">
          <ul className="divide-y divide-slate-200 dark:divide-white/10">
            {(by.HARDWARE ?? []).map((h) => {
              const isFull = h.availableUnits !== undefined && h.availableUnits <= 0;
              return (
                <li key={h.id} className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <span className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-600 dark:text-cyan-400 shrink-0">
                    <Laptop className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white">{h.name}</p>
                      {h.availableUnits !== undefined && (
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          !isFull ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        )}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', !isFull ? 'bg-emerald-500' : 'bg-rose-500')} />
                          {!isFull ? `${h.availableUnits} of ${h.maxCapacity ?? 10} units ready` : 'All rented'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{h.description}</p>
                  </div>
                  <p className="font-mono font-bold text-slate-900 dark:text-white">
                    {naira(h.price)}<span className="font-sans text-xs font-normal text-slate-400">/{h.unit}</span>
                  </p>
                  <Button
                    size="sm"
                    variant={isFull ? 'outline' : 'primary'}
                    disabled={isFull}
                    onClick={() => setSelected(h)}
                  >
                    {isFull ? 'Unavailable' : 'Rent device'}
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>
      </Section>

      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <span>Lounge Orders</span>
            <Badge tone="amber">Coming Soon</Badge>
          </span>
        }
        subtitle="Cafeteria and desk-side refreshment ordering is coming soon to the hub."
      >
        {LOUNGE_COMING_SOON ? <LoungeComingSoonCover /> : <Lounge menu={by.LOUNGE ?? []} />}
      </Section>

      <BookModal key={selected?.id} item={selected} onClose={() => setSelected(null)} />
    </>
  );
}
