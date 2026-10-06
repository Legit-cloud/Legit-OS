import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Clock, Hourglass, Receipt } from 'lucide-react';
import { Badge, Button, Card, Loading, PageHeader, StatCard, StatusBadge, Tabs } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDateTime, naira } from '../../lib/format';
import type { Invoice } from '../../lib/types';
import { toast } from '../../store/toast';

type Row = Invoice & { user: { fullName: string; email: string } };
interface LedgerData {
  invoices: Row[];
  totals: { status: string; kind: string; _sum: { amount: number | null }; _count: number }[];
}
type Filter = '' | Invoice['status'];

export default function Ledger() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Filter>('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'ledger', status],
    queryFn: () => api<LedgerData>(`/admin/ledger?status=${status}`),
  });
  const voidInvoice = useMutation({
    mutationFn: (id: string) => api(`/admin/ledger/${id}/void`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Invoice voided');
      qc.invalidateQueries({ queryKey: ['admin', 'ledger'] });
    },
    onError: (e) => toast.error('Could not void', errorMessage(e)),
  });

  if (isLoading || !data) return <Loading />;
  const sum = (s: string) => data.totals.filter((t) => t.status === s).reduce((a, t) => a + (t._sum.amount ?? 0), 0);
  const revenueByKind = data.totals.filter((t) => t.status === 'PAID').sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0));
  const paid = sum('PAID');

  return (
    <>
      <PageHeader eyebrow="Global Ledger" title="All transactions" subtitle="Every invoice raised across the hub." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Banknote className="h-5 w-5" />} label="Collected" value={naira(paid)} />
        <StatCard icon={<Hourglass className="h-5 w-5" />} label="Under review" value={naira(sum('AWAITING_REVIEW'))} />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Outstanding" value={naira(sum('PENDING'))} />
        <StatCard icon={<Receipt className="h-5 w-5" />} label="Invoices" value={data.totals.reduce((a, t) => a + t._count, 0)} />
      </div>

      {revenueByKind.length > 0 && (
        <Card className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Revenue by stream</p>
          <div className="mt-4 space-y-3">
            {revenueByKind.map((t) => {
              const pct = paid ? Math.round(((t._sum.amount ?? 0) / paid) * 100) : 0;
              return (
                <div key={t.kind} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-sm">
                  <span className="font-medium">{t.kind}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" style={{ width: `${pct}%` }} /></div>
                  <span className="font-mono text-xs">{naira(t._sum.amount ?? 0)} · {pct}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="mb-4 mt-8">
        <Tabs<Filter>
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'All' },
            { value: 'PAID', label: 'Paid' },
            { value: 'AWAITING_REVIEW', label: 'Under review' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'VOID', label: 'Void' },
          ]}
        />
      </div>
      <Card className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Member</th><th className="px-5 py-3">Description</th><th className="px-5 py-3">Type</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3">Status</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {data.invoices.map((i) => (
              <tr key={i.id}>
                <td className="px-5 py-3 text-slate-500">{formatDateTime(i.createdAt)}</td>
                <td className="px-5 py-3 font-medium">{i.user.fullName}</td>
                <td className="px-5 py-3">{i.description}</td>
                <td className="px-5 py-3"><Badge>{i.kind}</Badge></td>
                <td className="px-5 py-3 text-right font-mono">{naira(i.amount)}</td>
                <td className="px-5 py-3"><StatusBadge status={i.status} /></td>
                <td className="px-5 py-3 text-right">
                  {i.status === 'PENDING' && <Button size="sm" variant="ghost" onClick={() => confirm('Void this invoice?') && voidInvoice.mutate(i.id)}>Void</Button>}
                </td>
              </tr>
            ))}
            {data.invoices.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-500">No invoices.</td></tr>}
          </tbody>
        </table>
      </Card>
    </>
  );
}
