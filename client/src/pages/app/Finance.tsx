import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building, CalendarClock, Copy, CreditCard, FileUp, Landmark, Receipt, Send, X } from 'lucide-react';
import { Badge, Button, Card, Empty, Field, Loading, PageHeader, StatusBadge, cn } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDate, formatDateTime, naira, tierLabel } from '../../lib/format';
import type { Invoice, PaymentProof, Tier } from '../../lib/types';
import { toast } from '../../store/toast';

interface FinanceData {
  bank: { bankName: string; accountName: string; accountNumber: string };
  plan: { tier: Tier; renewsAt: string | null; proPrice: number };
  invoices: Invoice[];
  proofs: PaymentProof[];
}

const MAX_BYTES = 5 * 1024 * 1024;

function Uploader({ file, onFile }: { file: File | null; onFile: (f: File | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const accept = (f: File | undefined) => {
    if (!f) return;
    if (!(f.type.startsWith('image/') || f.type === 'application/pdf')) return toast.error('Unsupported file', 'Upload an image or PDF receipt.');
    if (f.size > MAX_BYTES) return toast.error('File too large', 'Receipts must be under 5MB.');
    onFile(f);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    accept(e.dataTransfer.files[0]);
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/40 bg-cyan-500/5 px-4 py-3">
        <FileUp className="h-5 w-5 text-cyan-500" />
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{file.name}</span><span className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</span></span>
        <button type="button" onClick={() => onFile(null)} className="rounded-full p-1 hover:bg-slate-200 dark:hover:bg-white/10" aria-label="Remove file"><X className="h-4 w-4" /></button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={cn(
        'flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed px-4 py-8 text-center transition',
        drag ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-300 hover:border-cyan-400 dark:border-white/15',
      )}
    >
      <FileUp className="h-8 w-8 text-cyan-500" />
      <span className="text-sm font-semibold">Drag & drop your receipt, or click to browse</span>
      <span className="text-xs text-slate-500">PNG, JPG or PDF · max 5MB</span>
      <input ref={input} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => accept(e.target.files?.[0])} />
    </button>
  );
}

export default function Finance() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useQuery({ queryKey: ['finance'], queryFn: () => api<FinanceData>('/finance') });

  const [invoiceId, setInvoiceId] = useState(params.get('invoice') ?? '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const payable = data?.invoices.filter((i) => i.status === 'PENDING') ?? [];
  const selected = payable.find((i) => i.id === invoiceId);

  // Prefill the amount whenever an invoice is chosen (from the URL or the picker).
  useEffect(() => {
    if (selected) setAmount(String(selected.amount));
  }, [selected?.id]);

  useEffect(() => {
    if (params.get('invoice') && data) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [params, data]);

  const submit = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('receipt', file!);
      form.append('amount', amount);
      if (invoiceId) form.append('invoiceId', invoiceId);
      if (note) form.append('note', note);
      return api<PaymentProof>('/finance/proofs', { form });
    },
    onSuccess: () => {
      toast.success('Proof submitted', 'An admin will verify your transfer shortly.');
      setFile(null);
      setAmount('');
      setNote('');
      setInvoiceId('');
      setParams({});
      for (const k of ['finance', 'courses', 'bookings']) qc.invalidateQueries({ queryKey: [k] });
    },
    onError: (e) => toast.error('Submission failed', errorMessage(e)),
  });

  const upgrade = useMutation({
    mutationFn: () => api<Invoice>('/finance/subscribe', { body: { tier: 'PRO_MONTHLY' } }),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ['finance'] }).then(() => setInvoiceId(inv.id));
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    },
    onError: (e) => toast.error('Upgrade failed', errorMessage(e)),
  });

  if (isLoading || !data) return <Loading />;

  const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast.success('Copied', text));
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Receipt required', 'Attach your bank transfer receipt.');
    submit.mutate();
  };
  const payInvoice = (id: string) => {
    setInvoiceId(id);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <PageHeader eyebrow="Finance & Logs" title="Billing" subtitle="Pay by bank transfer, upload your receipt and track every invoice." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><CreditCard className="h-4 w-4 text-cyan-500" /> Active plan</p>
          <p className="mt-3 font-display text-2xl font-bold">{tierLabel(data.plan.tier)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <CalendarClock className="h-4 w-4" />
            {data.plan.renewsAt ? `Renews ${formatDate(data.plan.renewsAt)}` : 'No renewal — pay per booking'}
          </p>
          {data.plan.tier === 'PAY_AS_YOU_GO' && (
            <Button size="sm" className="mt-4" loading={upgrade.isPending} onClick={() => upgrade.mutate()}>Upgrade to Pro · {naira(data.plan.proPrice)}/mo</Button>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Landmark className="h-4 w-4 text-cyan-500" /> Official hub bank details</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ['Bank', data.bank.bankName],
              ['Account name', data.bank.accountName],
              ['Account number', data.bank.accountNumber],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-100 p-4 dark:bg-white/5">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-1 flex items-center justify-between gap-2 font-semibold">
                  <span className={cn(label === 'Account number' && 'font-mono text-lg tracking-wider')}>{value}</span>
                  {label === 'Account number' && (
                    <button onClick={() => copy(value)} className="rounded-full p-1.5 text-cyan-600 hover:bg-cyan-500/10" aria-label="Copy account number"><Copy className="h-4 w-4" /></button>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-slate-500">Only pay into this account. L.E.G.I.T staff will never ask you to pay into a personal account.</p>
        </Card>
      </div>

      <div ref={formRef} className="mt-4 grid scroll-mt-24 gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Building className="h-5 w-5 text-cyan-500" /> Manual bank transfer</h2>
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <Field label="Paying for">
              <select className="field" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
                <option value="">General payment (no invoice)</option>
                {payable.map((i) => <option key={i.id} value={i.id}>{i.description} — {naira(i.amount)}</option>)}
              </select>
            </Field>
            <Field label="Amount transferred (₦)">
              <input className="field font-mono" type="number" min={1} step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </Field>
            {selected && Number(amount) > 0 && Number(amount) < selected.amount && (
              <p className="rounded-2xl bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-300">This is less than the invoice total of {naira(selected.amount)}.</p>
            )}
            <Field label="Bank receipt / proof of payment"><Uploader file={file} onFile={setFile} /></Field>
            <Field label="Note (optional)">
              <input className="field" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sender name, reference…" />
            </Field>
            <Button type="submit" className="w-full" loading={submit.isPending}><Send className="h-4 w-4" /> Submit Proof to Admin</Button>
          </form>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-bold">Submitted proofs</h2>
          {data.proofs.length === 0 ? (
            <Empty icon={<Receipt className="h-10 w-10" />} title="No proofs yet" hint="Receipts you submit will appear here with their review status." />
          ) : (
            <ul className="mt-4 space-y-3">
              {data.proofs.map((p) => (
                <li key={p.id} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{naira(p.amount)}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{p.invoice?.description ?? 'General payment'} · {formatDateTime(p.createdAt)}</p>
                  {p.reviewNote && <p className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-white/5">Admin: {p.reviewNote}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4 overflow-x-auto">
        <h2 className="font-display text-lg font-bold">Invoice history</h2>
        {data.invoices.length === 0 ? (
          <Empty title="No invoices yet" />
        ) : (
          <table className="mt-4 w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="pb-3 font-semibold">Date</th><th className="pb-3 font-semibold">Description</th><th className="pb-3 font-semibold">Type</th><th className="pb-3 text-right font-semibold">Amount</th><th className="pb-3 pl-4 font-semibold">Status</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {data.invoices.map((i) => (
                <tr key={i.id}>
                  <td className="py-3 text-slate-500">{formatDate(i.createdAt)}</td>
                  <td className="py-3 font-medium">{i.description}</td>
                  <td className="py-3"><Badge>{i.kind}</Badge></td>
                  <td className="py-3 text-right font-mono">{naira(i.amount)}</td>
                  <td className="py-3 pl-4"><StatusBadge status={i.status} /></td>
                  <td className="py-3 text-right">{i.status === 'PENDING' && <Button size="sm" variant="outline" onClick={() => payInvoice(i.id)}>Pay</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
