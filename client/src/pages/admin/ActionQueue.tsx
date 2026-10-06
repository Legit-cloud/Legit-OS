import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, FileText, Inbox, UtensilsCrossed, XCircle } from 'lucide-react';
import { Badge, Button, Card, Empty, Field, Loading, Modal, PageHeader, StatusBadge } from '../../components/ui';
import { api, apiBlob, errorMessage } from '../../lib/api';
import { formatDateTime, naira, timeAgo } from '../../lib/format';
import type { Invoice, LoungeOrder, PaymentProof } from '../../lib/types';
import { toast } from '../../store/toast';

type QueueProof = PaymentProof & { receiptType: string; user: { id: string; fullName: string; email: string }; invoice: Invoice | null };
type QueueOrder = LoungeOrder & { user: { fullName: string } };
interface QueueData {
  proofs: QueueProof[];
  orders: QueueOrder[];
  reviewed: (PaymentProof & { user: { fullName: string } })[];
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
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'queue'], queryFn: () => api<QueueData>('/admin/queue') });
  const [rejecting, setRejecting] = useState<QueueProof | null>(null);
  const [reason, setReason] = useState('');

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin'] });
  };
  const approve = useMutation({
    mutationFn: (id: string) => api(`/admin/proofs/${id}/approve`, { body: {} }),
    onSuccess: () => {
      toast.success('Payment approved', 'Access has been unlocked for the member.');
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
    onSuccess: refresh,
    onError: (e) => toast.error('Update failed', errorMessage(e)),
  });

  if (isLoading || !data) return <Loading />;

  return (
    <>
      <PageHeader eyebrow="Action Queue" title="Payment verifications" subtitle="Review bank transfer receipts. Approval unlocks the member's course, booking or plan automatically." />

      {data.proofs.length === 0 ? (
        <Card><Empty icon={<Inbox className="h-10 w-10" />} title="Queue is clear" hint="New receipts will appear here in real time." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.proofs.map((p) => {
            const mismatch = p.invoice && Math.abs(p.invoice.amount - p.amount) > 0.01;
            return (
              <Card key={p.id} className="flex flex-col">
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
                <div className="mt-4 grid grid-cols-2 gap-2 pt-1">
                  <Button variant="success" loading={approve.isPending && approve.variables === p.id} onClick={() => approve.mutate(p.id)}>
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </Button>
                  <Button variant="danger" onClick={() => setRejecting(p)}><XCircle className="h-4 w-4" /> Reject</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 mt-10 flex items-center gap-2 font-display text-lg font-bold"><UtensilsCrossed className="h-5 w-5 text-cyan-500" /> Lounge orders</h2>
      {data.orders.length === 0 ? (
        <Card><Empty title="No open lounge orders" /></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.orders.map((o) => {
            const items = JSON.parse(o.itemsJson) as { name: string; qty: number }[];
            return (
              <Card key={o.id}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{o.user.fullName}</p>
                  <StatusBadge status={o.status} />
                </div>
                <ul className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {items.map((i) => <li key={i.name}>{i.qty}× {i.name}</li>)}
                  {o.customItem && <li className="text-amber-600">+ {o.customItem} (custom)</li>}
                </ul>
                {o.notes && <p className="mt-1 text-xs text-slate-500">Note: {o.notes}</p>}
                <p className="mt-2 text-xs text-slate-500">{naira(o.total)} · {formatDateTime(o.createdAt)} {o.status === 'PLACED' && o.total > 0 && '· awaiting payment'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.status !== 'PREPARING' && o.status !== 'READY' && <Button size="sm" variant="outline" onClick={() => orderStatus.mutate({ id: o.id, status: 'PREPARING' })}>Preparing</Button>}
                  {o.status !== 'READY' && <Button size="sm" variant="outline" onClick={() => orderStatus.mutate({ id: o.id, status: 'READY' })}>Ready</Button>}
                  <Button size="sm" variant="success" onClick={() => orderStatus.mutate({ id: o.id, status: 'DELIVERED' })}>Delivered</Button>
                  <Button size="sm" variant="ghost" onClick={() => orderStatus.mutate({ id: o.id, status: 'CANCELLED' })}>Cancel</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {data.reviewed.length > 0 && (
        <Card className="mt-10 overflow-x-auto">
          <h2 className="font-display text-lg font-bold">Recently reviewed</h2>
          <table className="mt-3 w-full min-w-[560px] text-left text-sm">
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {data.reviewed.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 font-medium">{r.user.fullName}</td>
                  <td className="py-2.5 text-slate-500">{r.invoice?.description ?? 'General payment'}</td>
                  <td className="py-2.5 font-mono">{naira(r.amount)}</td>
                  <td className="py-2.5"><StatusBadge status={r.status} /></td>
                  <td className="py-2.5 text-right text-xs text-slate-500">{r.reviewedAt && timeAgo(r.reviewedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

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
            <textarea className="field min-h-24" required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Receipt is unreadable — please re-upload a clearer copy." />
          </Field>
          <Button type="submit" variant="danger" className="w-full" loading={reject.isPending}>Reject proof</Button>
        </form>
      </Modal>
    </>
  );
}
