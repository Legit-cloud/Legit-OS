import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Check, Minus, Plus, Search, ShieldCheck, ShieldOff, UserCog, X } from 'lucide-react';
import { Avatar, Badge, Button, Card, Field, Loading, Modal, PageHeader, StatusBadge } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDate, naira, tierLabel } from '../../lib/format';
import type { Invoice, PaymentProof, Tier, User } from '../../lib/types';
import { useAuth } from '../../store/auth';
import { toast } from '../../store/toast';

type Row = User & { paymentStatus: 'CLEAR' | 'OUTSTANDING' | 'AWAITING_REVIEW'; online: boolean };
type Detail = User & {
  online: boolean;
  invoices: Invoice[];
  payments: PaymentProof[];
  courseAccess: { id: string; paidAmount: number; isFullyPaid: boolean; course: { title: string; fullPrice: number } }[];
  bookings: { id: string; status: string; amount: number; item: { name: string } }[];
};
type Patch = Partial<Pick<User, 'fullName' | 'email' | 'phone' | 'role' | 'tier' | 'status' | 'verified'>> & { pointsDelta?: number };

function UserPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const me = useAuth((s) => s.user)!;
  const { data: u, isLoading } = useQuery({ queryKey: ['admin', 'user', id], queryFn: () => api<Detail>(`/admin/users/${id}`) });
  const [edit, setEdit] = useState({ fullName: '', email: '', phone: '' });
  const [points, setPoints] = useState(50);
  useEffect(() => {
    if (u) setEdit({ fullName: u.fullName, email: u.email, phone: u.phone ?? '' });
  }, [u]);

  const patch = useMutation({
    mutationFn: (body: Patch) => api<User>(`/admin/users/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      toast.success('User updated');
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error('Update failed', errorMessage(e)),
  });

  const approveVerification = useMutation({
    mutationFn: () => api<{ ok: boolean; user: User }>(`/admin/users/${id}/approve`, { method: 'POST', body: {} }),
    onSuccess: () => {
      toast.success('Identity Approved', 'Member marked as active and verified. Confirmation email sent.');
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error('Approval failed', errorMessage(e)),
  });

  const rejectVerification = useMutation({
    mutationFn: (reason: string) => api<{ ok: boolean; user: User }>(`/admin/users/${id}/reject`, { method: 'POST', body: { reason } }),
    onSuccess: () => {
      toast.info('Verification Rejected', 'Member status set to REJECTED and email sent.');
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error('Rejection failed', errorMessage(e)),
  });

  if (isLoading || !u) return <Loading />;
  const self = u.id === me.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar name={u.fullName} size="lg" online={u.online} />
        <div className="min-w-0">
          <p className="font-display text-xl font-bold">{u.fullName}</p>
          <p className="text-sm text-slate-500">{u.email} · joined {formatDate(u.createdAt)}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge tone={u.role === 'ADMIN' ? 'violet' : 'slate'}>{u.role}</Badge>
            <Badge tone="cyan">{tierLabel(u.tier)}</Badge>
            <StatusBadge status={u.status} />
            {u.verified && <Badge tone="green">Verified</Badge>}
          </div>
        </div>
      </div>

      {(u.idDocument || u.facePicture || u.status === 'PENDING_VERIFICATION') && (
        <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm flex items-center gap-1.5 text-slate-900 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-cyan-500" />
                Identity & Biometric Verification Desk
              </p>
              <p className="text-xs text-slate-500">
                Document Type: <span className="font-semibold text-slate-700 dark:text-slate-300">{u.idType || 'Government ID (NIN)'}</span>
              </p>
            </div>
            <StatusBadge status={u.status} />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
                Uploaded ID Document
              </span>
              {u.idDocument ? (
                <a href={u.idDocument} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                  <img src={u.idDocument} alt="ID Document" className="h-36 w-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">View full</span>
                </a>
              ) : (
                <div className="h-36 grid place-items-center rounded-xl bg-slate-100 dark:bg-white/5 text-xs text-slate-400">
                  No ID uploaded
                </div>
              )}
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
                Live Face Capture
              </span>
              {u.facePicture ? (
                <a href={u.facePicture} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                  <img src={u.facePicture} alt="Face Snapshot" className="h-36 w-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">View full</span>
                </a>
              ) : (
                <div className="h-36 grid place-items-center rounded-xl bg-slate-100 dark:bg-white/5 text-xs text-slate-400">
                  No face snapshot
                </div>
              )}
            </div>
          </div>

          {u.verificationNote && (
            <p className="text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg">
              <strong>Previous Rejection Note:</strong> {u.verificationNote}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="success"
              loading={approveVerification.isPending}
              onClick={() => approveVerification.mutate()}
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Approve & Activate Member
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={rejectVerification.isPending}
              onClick={() => {
                const note = prompt('Reason for rejection (will be emailed to the member):', 'ID document is blurry or does not match face photo.');
                if (note !== null) rejectVerification.mutate(note);
              }}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Reject Verification
            </Button>
          </div>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <Field label="Full name"><input className="field" value={edit.fullName} onChange={(e) => setEdit({ ...edit, fullName: e.target.value })} /></Field>
        <Field label="Email"><input className="field" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
        <Field label="Phone"><input className="field" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
        <div className="sm:col-span-3 flex justify-end">
          <Button size="sm" variant="outline" loading={patch.isPending} onClick={() => patch.mutate({ ...edit, phone: edit.phone || null })}>Save details</Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Membership tier">
          <select className="field" value={u.tier} onChange={(e) => patch.mutate({ tier: e.target.value as Tier })}>
            {(['PAY_AS_YOU_GO', 'PRO_MONTHLY', 'VIP'] as Tier[]).map((t) => <option key={t} value={t}>{tierLabel(t)}</option>)}
          </select>
        </Field>
        <Field label={`Points balance: ${u.points}`}>
          <div className="flex gap-2">
            <input className="field font-mono" type="number" min={1} value={points} onChange={(e) => setPoints(Math.abs(Number(e.target.value)))} aria-label="Points to adjust" />
            <Button size="sm" variant="success" onClick={() => patch.mutate({ pointsDelta: points })} aria-label="Add points"><Plus className="h-4 w-4" /></Button>
            <Button size="sm" variant="danger" onClick={() => patch.mutate({ pointsDelta: -points })} aria-label="Remove points"><Minus className="h-4 w-4" /></Button>
          </div>
        </Field>
      </section>

      <section className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => patch.mutate({ verified: !u.verified })}>
          <ShieldCheck className="h-4 w-4" /> {u.verified ? 'Remove verification' : 'Mark verified'}
        </Button>
        {!self && (
          <Button size="sm" variant="outline" onClick={() => patch.mutate({ role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' })}>
            <UserCog className="h-4 w-4" /> {u.role === 'ADMIN' ? 'Demote to member' : 'Promote to admin'}
          </Button>
        )}
        {!self && (u.status === 'ACTIVE' ? (
          <>
            <Button size="sm" variant="danger" onClick={() => confirm(`Suspend ${u.fullName}?`) && patch.mutate({ status: 'SUSPENDED' })}><ShieldOff className="h-4 w-4" /> Suspend</Button>
            <Button size="sm" variant="danger" onClick={() => confirm(`Ban ${u.fullName}? They will be signed out immediately.`) && patch.mutate({ status: 'BANNED' })}><Ban className="h-4 w-4" /> Ban</Button>
          </>
        ) : (
          <Button size="sm" variant="success" onClick={() => patch.mutate({ status: 'ACTIVE' })}>Reinstate account</Button>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Courses</p>
          {u.courseAccess.length === 0 ? <p className="text-sm text-slate-500">None</p> : (
            <ul className="space-y-1 text-sm">{u.courseAccess.map((c) => <li key={c.id}>{c.course.title} — {naira(c.paidAmount)}/{naira(c.course.fullPrice)}</li>)}</ul>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Recent invoices</p>
          {u.invoices.length === 0 ? <p className="text-sm text-slate-500">None</p> : (
            <ul className="space-y-1.5 text-sm">
              {u.invoices.slice(0, 6).map((i) => <li key={i.id} className="flex items-center justify-between gap-2"><span className="truncate">{i.description}</span><StatusBadge status={i.status} /></li>)}
            </ul>
          )}
        </div>
      </section>
      <div className="flex justify-end"><Button variant="ghost" onClick={onClose}>Close</Button></div>
    </div>
  );
}

export default function UserDirectory() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', debounced],
    queryFn: () => api<Row[]>(`/admin/users?q=${encodeURIComponent(debounced)}`),
  });

  return (
    <>
      <PageHeader eyebrow="User Directory" title="Members & control" subtitle="View profiles, adjust tiers and points, and manage account access." />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className="field rounded-full pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" aria-label="Search users" />
      </div>
      <Card className="overflow-x-auto p-0 sm:p-0">
        {isLoading ? <Loading /> : (
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Tier</th><th className="px-5 py-3">Payment</th><th className="px-5 py-3">Verification</th><th className="px-5 py-3">Account</th><th className="px-5 py-3 text-right">Points</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {data?.map((u) => (
                <tr key={u.id} onClick={() => setSelected(u.id)} className="cursor-pointer transition hover:bg-cyan-500/5">
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-3">
                      <Avatar name={u.fullName} size="sm" online={u.online} />
                      <span className="font-semibold">{u.fullName}</span>
                      {u.role === 'ADMIN' && <Badge tone="violet">Admin</Badge>}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{u.email}</td>
                  <td className="px-5 py-3">{tierLabel(u.tier)}</td>
                  <td className="px-5 py-3"><StatusBadge status={u.paymentStatus} /></td>
                  <td className="px-5 py-3">{u.verified ? <Badge tone="green">Verified</Badge> : <Badge>Unverified</Badge>}</td>
                  <td className="px-5 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-5 py-3 text-right font-mono">{u.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Member profile" wide>
        {selected && <UserPanel id={selected} onClose={() => setSelected(null)} />}
      </Modal>
    </>
  );
}
