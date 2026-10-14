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

function Section({ title, subtitle, children }: { title: React.ReactNode; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="mb-4 text-sm text-slate-500">{subtitle}</p>
      {children}
    </section>
  );
}

function Stepper({ value, onChange, min = 1, max = 99, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 p-1 dark:border-white/10" aria-label={label}>
      <button type="button" className="rounded-full p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/10" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Decrease ${label}`}><Minus className="h-3.5 w-3.5" /></button>
      <span className="w-8 text-center font-mono text-sm font-semibold tabular-nums">{value}</span>
      <button type="button" className="rounded-full p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/10" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`Increase ${label}`}><Plus className="h-3.5 w-3.5" /></button>
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
  return (
    <Modal open onClose={onClose} title={`Book ${item.name}`}>
      <p className="text-sm text-slate-500">{item.description}</p>
      <div className="mt-5 flex items-center justify-between">
        <span className="text-sm font-semibold">How many {item.unit}s?</span>
        <Stepper value={qty} onChange={setQty} max={max} label={`${item.unit}s`} />
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-cyan-500/10 px-4 py-3">
        <span className="text-sm">{naira(item.price)} × {qty} {item.unit}{qty > 1 ? 's' : ''}</span>
        <span className="font-display text-xl font-bold">{naira(item.price * qty)}</span>
      </div>
      <Button className="mt-5 w-full" loading={book.isPending} onClick={() => book.mutate({ itemId: item.id, quantity: qty })}>
        Book & proceed to payment
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

  return (
    <Card className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <div className="inline-flex rounded-full border border-slate-200 p-1 dark:border-white/10" role="radiogroup" aria-label="Desk plan">
          {(['hour', 'day'] as const).filter((m) => desks.some((d) => d.unit === m)).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={mode === m}
              onClick={() => { setMode(m); setQty(m === 'hour' ? 2 : 1); }}
              className={cn('rounded-full px-5 py-2 text-sm font-semibold transition', mode === m ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white' : 'text-slate-600 dark:text-slate-300')}
            >
              {m === 'hour' ? 'Hourly rate' : 'Day pass'}
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-start gap-4">
          <span className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-600 dark:text-cyan-400"><Armchair className="h-6 w-6" /></span>
          <div>
            <p className="font-display text-lg font-bold">{desk.name}</p>
            <p className="text-sm text-slate-500">{desk.description}</p>
            <p className="mt-1 font-semibold text-cyan-600 dark:text-cyan-400">{naira(desk.price)} / {desk.unit}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-start gap-3 md:items-end">
        <Stepper value={qty} onChange={setQty} max={mode === 'hour' ? 12 : 30} label={`${mode}s`} />
        <p className="font-display text-2xl font-bold">{naira(desk.price * qty)}</p>
        <Button loading={book.isPending} onClick={() => book.mutate({ itemId: desk.id, quantity: qty })}>Reserve desk</Button>
      </div>
    </Card>
  );
}

// Set to true to display the Coming Soon status on the user end while preserving all underlying code.
const LOUNGE_COMING_SOON = true;

function LoungeComingSoonCover() {
  return (
    <Card className="relative overflow-hidden p-8 sm:p-12 text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
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
            return (
              <Card key={f.id} className="flex flex-col">
                <span className="w-fit rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-3 text-white"><Icon className="h-5 w-5" /></span>
                <p className="mt-4 font-display text-lg font-bold">{f.name}</p>
                <p className="flex-1 text-sm text-slate-500">{f.description}</p>
                <p className="mt-3 font-semibold">{naira(f.price)}<span className="text-sm font-normal text-slate-500">/hr</span></p>
                <Button size="sm" className="mt-3" onClick={() => setSelected(f)}>Book</Button>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section title="Hub Programs" subtitle="Monthly program subscriptions for founders and builders.">
        <div className="grid gap-4 md:grid-cols-2">
          {(by.PROGRAM ?? []).map((p) => (
            <Card key={p.id} className="relative overflow-hidden">
              <Sparkles className="absolute -right-3 -top-3 h-24 w-24 text-cyan-500/10" />
              <Badge tone="cyan">Subscription</Badge>
              <p className="mt-3 font-display text-xl font-bold">{p.name}</p>
              <p className="text-sm text-slate-500">{p.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <p className="font-display text-2xl font-bold">{naira(p.price)}<span className="text-sm font-normal text-slate-500">/month</span></p>
                <Button loading={book.isPending && book.variables?.itemId === p.id} onClick={() => book.mutate({ itemId: p.id, quantity: 1 })}>Subscribe</Button>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Hardware Rentals" subtitle="Rent high-spec workstations by the day.">
        <Card className="p-0 sm:p-0">
          <ul className="divide-y divide-slate-200 dark:divide-white/10">
            {(by.HARDWARE ?? []).map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <Laptop className="h-6 w-6 text-cyan-500" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{h.name}</p>
                  <p className="text-sm text-slate-500">{h.description}</p>
                </div>
                <p className="font-semibold">{naira(h.price)}<span className="text-sm font-normal text-slate-500">/day</span></p>
                <Button size="sm" variant="outline" onClick={() => setSelected(h)}>Rent</Button>
              </li>
            ))}
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
