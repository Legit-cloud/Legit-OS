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
        <Card variant="bento" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <CreditCard className="h-4 w-4 text-cyan-500" /> Active Membership
              </p>
              <Badge tone="cyan">{data.plan.tier === 'VIP' ? 'VIP Access' : data.plan.tier === 'PRO_MONTHLY' ? 'Pro Resident' : 'Flex Member'}</Badge>
            </div>
            <p className="mt-4 font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {tierLabel(data.plan.tier)}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <CalendarClock className="h-3.5 w-3.5" />
              {data.plan.renewsAt ? `Renews on ${formatDate(data.plan.renewsAt)}` : 'Pay-as-you-go · No auto-renewal'}
            </p>
          </div>
          {data.plan.tier === 'PAY_AS_YOU_GO' && (
            <Button
              size="sm"
              className="mt-6 w-full bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-colors"
              loading={upgrade.isPending}
              onClick={() => upgrade.mutate()}
            >
              Upgrade to Pro · {naira(data.plan.proPrice)}/mo
            </Button>
          )}
        </Card>

        {/* Official Hub Virtual Bank Card */}
        <Card variant="bento" className="lg:col-span-2 relative overflow-hidden bg-white border border-slate-200/90 text-slate-900 shadow-sm dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 dark:border-blue-500/30 dark:text-white dark:shadow-xl">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl pointer-events-none dark:bg-blue-500/10" />
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Official Hub Transfer Account</span>
            </div>
            <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse dark:bg-emerald-400" /> Verified Direct Billing
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-4 backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Designated Bank</p>
              <p className="mt-1 font-display text-base font-bold text-slate-900 dark:text-white">{data.bank.bankName}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-4 backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Account Name</p>
              <p className="mt-1 font-display text-sm font-bold text-slate-900 dark:text-white truncate" title={data.bank.accountName}>
                {data.bank.accountName}
              </p>
            </div>
            <div className="rounded-2xl bg-blue-50/70 border border-blue-200/80 p-4 backdrop-blur-sm dark:bg-blue-500/10 dark:border-blue-500/30">
              <p className="text-[11px] font-medium text-blue-600 uppercase tracking-wider dark:text-blue-300">Account Number</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-mono text-lg font-bold tracking-widest text-blue-700 dark:text-blue-200">
                  {data.bank.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={() => copy(data.bank.accountNumber)}
                  className="rounded-lg bg-blue-600/10 p-1.5 text-blue-600 hover:bg-blue-600/20 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition"
                  aria-label="Copy account number"
                  title="Copy account number"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />
            <span>Always verify account name matches <strong className="text-slate-800 dark:text-white">{data.bank.accountName}</strong>. L.E.G.I.T Innovation Hub never requests transfers to personal accounts.</span>
          </p>
        </Card>
      </div>

      <div ref={formRef} className="mt-4 grid scroll-mt-24 gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card variant="bento">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
            <Building className="h-5 w-5 text-blue-600" /> Manual bank transfer
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Submit your transaction details & receipt after transferring to the official account.
          </p>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <Field label="Paying for">
              <select className="field" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
                <option value="">General payment (no invoice)</option>
                {payable.map((i) => <option key={i.id} value={i.id}>{i.description} — {naira(i.amount)}</option>)}
              </select>
            </Field>
            <Field label="Amount transferred (₦)">
              <input className="field font-mono font-semibold" type="number" min={1} step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </Field>
            {selected && Number(amount) > 0 && Number(amount) < selected.amount && (
              <p className="rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300 font-medium">
                Note: This is less than the invoice total of {naira(selected.amount)}.
              </p>
            )}
            <Field label="Bank receipt / proof of payment"><Uploader file={file} onFile={setFile} /></Field>
            <Field label="Note (optional)">
              <input className="field" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sender name, bank session ID, reference…" />
            </Field>
            <Button
              type="submit"
              className="w-full bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-colors"
              loading={submit.isPending}
            >
              <Send className="h-4 w-4" /> Submit Proof to Admin
            </Button>
          </form>
        </Card>

        <Card variant="bento">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Submitted proofs</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Track verification by the hub administrative desk in real time.
          </p>
          {data.proofs.length === 0 ? (
            <Empty icon={<Receipt className="h-10 w-10" />} title="No proofs yet" hint="Receipts you submit will appear here with their review status." />
          ) : (
            <ul className="mt-4 space-y-3">
              {data.proofs.map((p) => (
                <li key={p.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-base font-bold text-slate-900 dark:text-white">{naira(p.amount)}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{p.invoice?.description ?? 'General payment'} · {formatDateTime(p.createdAt)}</p>
                  {p.reviewNote && (
                    <p className="mt-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-800 dark:text-blue-300">
                      <strong>Admin note:</strong> {p.reviewNote}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card variant="bento" className="mt-4 overflow-x-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Invoice history</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Complete record of your workspace, facility, course and hardware billings.</p>
          </div>
          <Badge tone="slate">{data.invoices.length} Invoices</Badge>
        </div>
        {data.invoices.length === 0 ? (
          <Empty title="No invoices yet" />
        ) : (
          <table className="mt-4 w-full min-w-[640px] text-left text-sm">
            <thead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="pb-3">Date</th>
                <th className="pb-3">Description</th>
                <th className="pb-3">Type</th>
                <th className="pb-3 text-right">Amount</th>
                <th className="pb-3 pl-4">Status</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
              {data.invoices.map((i) => (
                <tr key={i.id} className="transition hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                  <td className="py-3.5 text-xs text-slate-500 font-mono">{formatDate(i.createdAt)}</td>
                  <td className="py-3.5 font-medium text-slate-900 dark:text-slate-100">{i.description}</td>
                  <td className="py-3.5"><Badge tone="slate">{i.kind}</Badge></td>
                  <td className="py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">{naira(i.amount)}</td>
                  <td className="py-3.5 pl-4"><StatusBadge status={i.status} /></td>
                  <td className="py-3.5 text-right">
                    {i.status === 'PENDING' && (
                      <Button size="sm" className="bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors" onClick={() => payInvoice(i.id)}>
                        Pay now
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
