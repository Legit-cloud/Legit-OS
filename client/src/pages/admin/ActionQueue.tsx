import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, ExternalLink, FileText, Inbox, UtensilsCrossed, XCircle,
  Laptop, Calendar, Bike, GraduationCap, RefreshCw
} from 'lucide-react';
import {
  Badge, Button, Card, Empty, Field, Loading, Modal, PageHeader, StatusBadge, Tabs
} from '../../components/ui';
import { api, apiBlob, errorMessage } from '../../lib/api';
import { formatDateTime, naira, timeAgo } from '../../lib/format';
import { useSocketEvent } from '../../lib/socket';
import type { Invoice, LoungeOrder, PaymentProof, Category } from '../../lib/types';
import { toast } from '../../store/toast';

type QueueProof = PaymentProof & {
  receiptType: string;
  user: { id: string; fullName: string; email: string };
  invoice: Invoice | null;
};

type QueueOrder = LoungeOrder & {
  user: { fullName: string };
};

type QueueBooking = {
  id: string;
  userId: string;
  quantity: number;
  amount: number;
  status: string;
  createdAt: string;
  startsAt: string | null;
  endsAt: string | null;
  item: {
    id: string;
    name: string;
    category: Category;
    unit: string;
    price: number;
  };
  user: {
    id: string;
    fullName: string;
    email: string;
  };
};

type QueueEnrollment = {
  id: string;
  userId: string;
  courseId: string;
  paidAmount: number;
  isFullyPaid: boolean;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
    fullPrice: number;
    level: string;
  };
};

type QueueRide = {
  id: string;
  pickup: string;
  destination: string;
  notes: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    phone: string | null;
  };
  rider: {
    id: string;
    name: string;
    phone: string;
  } | null;
};

interface QueueData {
  proofs: QueueProof[];
  orders: QueueOrder[];
  reviewed: (PaymentProof & { user: { fullName: string }; invoice?: { description: string } })[];
  bookings?: QueueBooking[];
  enrollments?: QueueEnrollment[];
  rides?: QueueRide[];
}

function Receipt({ proof }: { proof: QueueProof }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    apiBlob(`/admin/proofs/${proof.id}/receipt`)
      .then((blob) => setUrl((objectUrl = URL.createObjectURL(blob))))
      .catch(() => setFailed(true));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [proof.id]);

  if (failed) return <p className="grid h-48 place-items-center rounded-2xl bg-slate-100 text-sm text-slate-500 dark:bg-white/5">Receipt file missing</p>;
  if (!url) return <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />;
  const isPdf = proof.receiptType === '.pdf';
  return (
    <div className="relative">
      {isPdf ? (
        <div className="grid h-48 place-items-center rounded-2xl bg-slate-100 dark:bg-white/5"><FileText className="h-12 w-12 text-slate-400" /></div>
      ) : (
        <img src={url} alt={`Receipt from ${proof.user.fullName}`} className="h-48 w-full rounded-2xl bg-slate-100 object-contain dark:bg-white/5" />
      )}
      <a href={url} target="_blank" rel="noreferrer" className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold text-white">
        Open <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

export default function ActionQueue() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'proofs' | 'orders' | 'bookings' | 'courses' | 'rides' | 'reviewed'>('proofs');
  const [rejecting, setRejecting] = useState<QueueProof | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'queue'],
    queryFn: () => api<QueueData>('/admin/queue'),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin'] });
  };

  useSocketEvent('queue:changed', () => {
    refresh();
    toast.info('New activity in queue', 'An order, booking or payment proof was submitted.');
  });

  const approve = useMutation({
    mutationFn: (id: string) => api(`/admin/proofs/${id}/approve`, { body: {} }),
    onSuccess: () => {
      toast.success('Payment approved', 'Service unlocked for member.');
      refresh();
    },
    onError: (e) => toast.error('Approval failed', errorMessage(e)),
  });

  const reject = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => api(`/admin/proofs/${id}/reject`, { body: { note } }),
    onSuccess: () => {
      toast.success('Proof rejected', 'The member has been notified.');
      setRejecting(null);
      setReason('');
      refresh();
    },
    onError: (e) => toast.error('Rejection failed', errorMessage(e)),
  });

  const orderStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api(`/admin/lounge/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      toast.success('Order status updated');
      refresh();
    },
    onError: (e) => toast.error('Update failed', errorMessage(e)),
  });

  const updateBooking = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api(`/admin/bookings/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      toast.success('Booking status updated');
      refresh();
      qc.invalidateQueries({ queryKey: ['admin', 'assets'] });
    },
    onError: (e) => toast.error('Update failed', errorMessage(e)),
  });

  if (isLoading || !data) return <Loading label="Loading action queue…" />;

  const proofs = data.proofs ?? [];
  const orders = data.orders ?? [];
  const bookings = data.bookings ?? [];
  const enrollments = data.enrollments ?? [];
  const rides = data.rides ?? [];
  const reviewed = data.reviewed ?? [];

  const tabOptions = [
    { value: 'proofs' as const, label: `Payment Proofs (${proofs.length})` },
    { value: 'orders' as const, label: `Lounge Orders (${orders.length})` },
    { value: 'bookings' as const, label: `Bookings & Hardware (${bookings.length})` },
    { value: 'courses' as const, label: `Course Purchases (${enrollments.length})` },
    { value: 'rides' as const, label: `Transit Rides (${rides.length})` },
    { value: 'reviewed' as const, label: 'Reviewed History' },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Order & Payment Response Center"
        title="Action Queue"
        subtitle="Review, approve, and respond to member payments, lounge food orders, hardware rentals, desk bookings, and course enrollments."
        actions={
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      <Tabs value={activeTab} onChange={setActiveTab} options={tabOptions} />

      <div className="mt-6">
        {/* PAYMENT PROOFS TAB */}
        {activeTab === 'proofs' && (
          <div>
            {proofs.length === 0 ? (
              <Card><Empty icon={<Inbox className="h-10 w-10 text-slate-400" />} title="Payment queue is clear" hint="New bank transfer receipts will appear here in real time." /></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {proofs.map((p) => {
                  const mismatch = p.invoice && Math.abs(p.invoice.amount - p.amount) > 0.01;
                  return (
                    <Card key={p.id} className="flex flex-col justify-between">
                      <div>
                        <Receipt proof={p} />
                        <div className="mt-4 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{p.user.fullName}</p>
                            <p className="truncate text-xs text-slate-500">{p.user.email}</p>
                          </div>
                          <p className="font-display text-xl font-bold">{naira(p.amount)}</p>
                        </div>
                        <p className="mt-2 text-sm">{p.invoice ? p.invoice.description : <span className="text-slate-500">General payment (no invoice)</span>}</p>
                        {p.invoice && (
                          <p className="mt-1 text-xs text-slate-500">
                            Invoice total {naira(p.invoice.amount)} {mismatch ? <Badge tone="amber" className="ml-1">Amount mismatch</Badge> : <Badge tone="green" className="ml-1">Matches</Badge>}
                          </p>
                        )}
                        {p.note && <p className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-white/5">“{p.note}”</p>}
                        <p className="mt-2 text-xs text-slate-400">Submitted {timeAgo(p.createdAt)}</p>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                        <Button variant="success" size="sm" loading={approve.isPending && approve.variables === p.id} onClick={() => approve.mutate(p.id)}>
                          <CheckCircle2 className="h-4 w-4" /> Approve
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => setRejecting(p)}>
                          <XCircle className="h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* LOUNGE ORDERS TAB */}
        {activeTab === 'orders' && (
          <div>
            {orders.length === 0 ? (
              <Card><Empty icon={<UtensilsCrossed className="h-10 w-10 text-slate-400" />} title="No pending lounge orders" hint="New food, drink, or snack orders placed by members will arrive here." /></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {orders.map((o) => {
                  const items = JSON.parse(o.itemsJson) as { name: string; qty: number }[];
                  return (
                    <Card key={o.id} className="flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{o.user.fullName}</p>
                          <StatusBadge status={o.status} />
                        </div>
                        <ul className="mt-3 divide-y divide-slate-100 text-sm text-slate-700 dark:divide-white/10 dark:text-slate-300">
                          {items.map((i) => (
                            <li key={i.name} className="py-1 flex justify-between">
                              <span>{i.name}</span>
                              <span className="font-mono font-semibold">× {i.qty}</span>
                            </li>
                          ))}
                          {o.customItem && <li className="py-1 text-amber-600 dark:text-amber-400 font-medium">+ {o.customItem} (custom request)</li>}
                        </ul>
                        {o.notes && <p className="mt-2 text-xs italic text-slate-500 bg-slate-50 p-2 rounded-lg dark:bg-white/5">"{o.notes}"</p>}
                        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                          <span className="font-display text-base font-bold text-slate-900 dark:text-white">{naira(o.total)}</span>
                          <span>{timeAgo(o.createdAt)}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                        {o.status !== 'PREPARING' && o.status !== 'READY' && (
                          <Button size="sm" variant="outline" onClick={() => orderStatus.mutate({ id: o.id, status: 'PREPARING' })}>
                            Start Preparing
                          </Button>
                        )}
                        {o.status !== 'READY' && (
                          <Button size="sm" variant="outline" onClick={() => orderStatus.mutate({ id: o.id, status: 'READY' })}>
                            Mark Ready
                          </Button>
                        )}
                        <Button size="sm" variant="success" onClick={() => orderStatus.mutate({ id: o.id, status: 'DELIVERED' })}>
                          Mark Delivered
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => orderStatus.mutate({ id: o.id, status: 'CANCELLED' })}>
                          Cancel
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* BOOKINGS & HARDWARE RENTALS TAB */}
        {activeTab === 'bookings' && (
          <div>
            {bookings.length === 0 ? (
              <Card><Empty icon={<Laptop className="h-10 w-10 text-slate-400" />} title="No open bookings" hint="Member bookings for hardware workstations, desks, or private studios will show here." /></Card>
            ) : (
              <Card className="overflow-x-auto p-0 sm:p-0">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-white/5">
                    <tr>
                      <th className="px-5 py-3">Member</th>
                      <th className="px-5 py-3">Item / Workstation</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Qty / Duration</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                        <td className="px-5 py-3 font-medium">
                          <div>{b.user.fullName}</div>
                          <div className="text-xs text-slate-500">{b.user.email}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-semibold flex items-center gap-2">
                            {b.item.category === 'HARDWARE' ? <Laptop className="h-4 w-4 text-cyan-500" /> : <Calendar className="h-4 w-4 text-cyan-500" />}
                            {b.item.name}
                          </div>
                          <div className="text-xs text-slate-500">{timeAgo(b.createdAt)}</div>
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={b.item.category === 'HARDWARE' ? 'cyan' : 'slate'}>{b.item.category}</Badge>
                        </td>
                        <td className="px-5 py-3">{b.quantity} {b.item.unit}{b.quantity > 1 ? 's' : ''}</td>
                        <td className="px-5 py-3 font-mono font-semibold">{naira(b.amount)}</td>
                        <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex gap-1.5">
                            {b.status === 'PENDING_PAYMENT' && (
                              <Button size="sm" variant="success" onClick={() => updateBooking.mutate({ id: b.id, status: 'CONFIRMED' })}>
                                Confirm
                              </Button>
                            )}
                            {b.status === 'CONFIRMED' && (
                              <Button size="sm" variant="primary" onClick={() => updateBooking.mutate({ id: b.id, status: 'ACTIVE' })}>
                                Check In
                              </Button>
                            )}
                            {b.status === 'ACTIVE' && (
                              <Button size="sm" variant="outline" onClick={() => updateBooking.mutate({ id: b.id, status: 'COMPLETED' })}>
                                Complete
                              </Button>
                            )}
                            {b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && (
                              <Button size="sm" variant="ghost" onClick={() => updateBooking.mutate({ id: b.id, status: 'CANCELLED' })}>
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}

        {/* COURSE PURCHASES TAB */}
        {activeTab === 'courses' && (
          <div>
            {enrollments.length === 0 ? (
              <Card><Empty icon={<GraduationCap className="h-10 w-10 text-slate-400" />} title="No course purchases" hint="Member enrollments and installment payments will show here." /></Card>
            ) : (
              <Card className="overflow-x-auto p-0 sm:p-0">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-white/5">
                    <tr>
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Course</th>
                      <th className="px-5 py-3">Amount Paid</th>
                      <th className="px-5 py-3">Payment Status</th>
                      <th className="px-5 py-3">Enrolled On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                    {enrollments.map((e) => (
                      <tr key={e.id}>
                        <td className="px-5 py-3 font-medium">
                          <div>{e.user.fullName}</div>
                          <div className="text-xs text-slate-500">{e.user.email}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-semibold">{e.course.title}</div>
                          <div className="text-xs text-slate-500">Tuition: {naira(e.course.fullPrice)}</div>
                        </td>
                        <td className="px-5 py-3 font-mono font-semibold">{naira(e.paidAmount)}</td>
                        <td className="px-5 py-3">
                          {e.isFullyPaid ? (
                            <Badge tone="green">Fully Paid</Badge>
                          ) : (
                            <Badge tone="amber">50% Installment</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500">{formatDateTime(e.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}

        {/* TRANSIT RIDES TAB */}
        {activeTab === 'rides' && (
          <div>
            {rides.length === 0 ? (
              <Card><Empty icon={<Bike className="h-10 w-10 text-slate-400" />} title="No pending transit rides" hint="When members request dispatch or rides, they appear here." /></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {rides.map((r) => (
                  <Card key={r.id}>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{r.user.fullName}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                      <p><strong>Pickup:</strong> {r.pickup}</p>
                      <p><strong>Dropoff:</strong> {r.destination}</p>
                      {r.rider && <p className="text-cyan-600"><strong>Rider:</strong> {r.rider.name} ({r.rider.phone})</p>}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Requested {timeAgo(r.createdAt)}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REVIEWED HISTORY TAB */}
        {activeTab === 'reviewed' && (
          <div>
            {reviewed.length === 0 ? (
              <Card><Empty title="No reviewed payment history yet" /></Card>
            ) : (
              <Card className="overflow-x-auto p-0 sm:p-0">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-white/5">
                    <tr>
                      <th className="px-5 py-3">Member</th>
                      <th className="px-5 py-3">Service / Description</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Outcome</th>
                      <th className="px-5 py-3 text-right">Reviewed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                    {reviewed.map((r) => (
                      <tr key={r.id}>
                        <td className="px-5 py-3 font-medium">{r.user.fullName}</td>
                        <td className="px-5 py-3 text-slate-500">{r.invoice?.description ?? 'General payment proof'}</td>
                        <td className="px-5 py-3 font-mono">{naira(r.amount)}</td>
                        <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                        <td className="px-5 py-3 text-right text-xs text-slate-500">{r.reviewedAt && timeAgo(r.reviewedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject payment proof">
        <p className="text-sm text-slate-500">{rejecting?.user.fullName} · {rejecting && naira(rejecting.amount)}</p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (rejecting) reject.mutate({ id: rejecting.id, note: reason });
          }}
        >
          <Field label="Reason (sent to the member)">
            <textarea
              className="field min-h-24"
              required
              minLength={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Receipt is unreadable — please re-upload a clear screenshot or PDF."
            />
          </Field>
          <Button type="submit" variant="danger" className="w-full" loading={reject.isPending}>
            Reject proof
          </Button>
        </form>
      </Modal>
    </>
  );
}
