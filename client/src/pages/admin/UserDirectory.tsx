import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Check, Copy, Mail, Minus, Plus, RefreshCw, Search, ShieldCheck, ShieldOff, Trash2, UserCog, UserPlus, X } from 'lucide-react';
import { Avatar, Badge, Button, Card, Field, Loading, Modal, PageHeader, StatusBadge, cn } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDate, formatDateTime, naira, tierLabel, timeAgo } from '../../lib/format';
import type { AdminInvite, Invoice, PaymentProof, Tier, User } from '../../lib/types';
import { useAuth } from '../../store/auth';
import { toast } from '../../store/toast';

type Row = User & { paymentStatus: 'CLEAR' | 'OUTSTANDING' | 'AWAITING_REVIEW'; online: boolean };
type Detail = User & {
  online: boolean;
  invoices: Invoice[];
  payments: PaymentProof[];
  courseAccess: { id: string; courseId: string; paidAmount: number; isFullyPaid: boolean; course: { id: string; title: string; fullPrice: number } }[];
  bookings: { id: string; status: string; amount: number; item: { name: string } }[];
};
type Patch = Partial<Pick<User, 'fullName' | 'email' | 'phone' | 'role' | 'tier' | 'status' | 'verified'>> & { pointsDelta?: number };

function InviteAdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [createdInvite, setCreatedInvite] = useState<AdminInvite | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteMutation = useMutation({
    mutationFn: (body: { fullName: string; email: string }) =>
      api<AdminInvite>('/admin/invites', { method: 'POST', body }),
    onSuccess: (invite) => {
      toast.success('Admin Invitation Sent', `An invitation email has been sent to ${invite.email}`);
      qc.invalidateQueries({ queryKey: ['admin', 'invites'] });
      setCreatedInvite(invite);
    },
    onError: (e) => toast.error('Failed to send invite', errorMessage(e)),
  });

  const handleClose = () => {
    setFullName('');
    setEmail('');
    setCreatedInvite(null);
    setCopied(false);
    onClose();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/admin/accept-invite?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.info('Link Copied', 'Invitation URL copied to clipboard.');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Modal open={open} onClose={handleClose} title="Invite New Administrator">
      {!createdInvite ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            inviteMutation.mutate({ fullName: fullName.trim(), email: email.trim() });
          }}
          className="space-y-4"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Invite a new team member to the administrator command center. They will receive an invitation email
            with a secure setup link to create their password and personal admin handle without any KYC or webcam verification.
          </p>

          <Field label="Full Name">
            <input
              required
              className="field"
              placeholder="e.g. Sarah Connor"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>

          <Field label="Work Email">
            <input
              required
              type="email"
              className="field"
              placeholder="e.g. sarah@legithub.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={inviteMutation.isPending}>
              <Mail className="h-4 w-4" /> Send Invitation
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
              <Check className="h-4 w-4" /> Invitation Generated & Emailed
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              An invitation email has been sent to <strong>{createdInvite.email}</strong>. You can also share the direct setup link below immediately.
            </p>
          </div>

          <Field label="Direct Setup Link (valid 48 hours)">
            <div className="flex items-center gap-2">
              <input
                readOnly
                className="field font-mono text-xs select-all"
                value={`${window.location.origin}/admin/accept-invite?token=${createdInvite.token}`}
              />
              <Button
                type="button"
                variant={copied ? 'success' : 'outline'}
                size="sm"
                onClick={() => copyLink(createdInvite.token)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </Field>

          <div className="flex justify-end pt-2">
            <Button type="button" variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

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

  const unenroll = useMutation({
    mutationFn: (courseId: string) =>
      api(`/admin/courses/${courseId}/students/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Student Unenrolled', 'Course access and lesson progress have been revoked.');
      qc.invalidateQueries({ queryKey: ['admin', 'user', id] });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] });
    },
    onError: (e) => toast.error('Failed to unenroll student', errorMessage(e)),
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
            {u.username && <span className="font-mono text-xs text-cyan-600 dark:text-cyan-400 font-bold self-center">@{u.username}</span>}
            <Badge tone="cyan">{tierLabel(u.tier)}</Badge>
            <StatusBadge status={u.status} />
            {u.verified && <Badge tone="green">Verified</Badge>}
          </div>
        </div>
      </div>

      {(u.idDocument || u.facePicture || u.status === 'PENDING_VERIFICATION') && (
        <section className="terminal-bezel p-5 space-y-4 border-cyan-500/40">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div>
              <p className="font-semibold text-sm flex items-center gap-2 text-cyan-400">
                <ShieldCheck className="h-4 w-4" />
                <span className="font-mono uppercase tracking-wider text-xs">Biometric Verification Terminal</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Document Type: <span className="font-semibold text-slate-200">{u.idType || 'Government ID (NIN)'}</span>
              </p>
            </div>
            <StatusBadge status={u.status} />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <span className="text-[10px] font-mono font-semibold uppercase text-cyan-400/80 block mb-1.5">
                ● Uploaded ID Document
              </span>
              {u.idDocument ? (
                <a href={u.idDocument} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-xl border border-white/10 shadow-lg bg-black/40">
                  <img src={u.idDocument} alt="ID Document" className="h-40 w-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] text-cyan-300 backdrop-blur-sm">View full</span>
                </a>
              ) : (
                <div className="h-40 grid place-items-center rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-400 font-mono">
                  No ID uploaded
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] font-mono font-semibold uppercase text-cyan-400/80 block mb-1.5">
                ● Live Face Capture
              </span>
              {u.facePicture ? (
                <a href={u.facePicture} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-xl border border-white/10 shadow-lg bg-black/40">
                  <img src={u.facePicture} alt="Face Snapshot" className="h-40 w-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] text-cyan-300 backdrop-blur-sm">View full</span>
                </a>
              ) : (
                <div className="h-40 grid place-items-center rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-400 font-mono">
                  No face snapshot
                </div>
              )}
            </div>
          </div>

          {u.verificationNote && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl font-mono">
              <strong>Previous Rejection Note:</strong> {u.verificationNote}
            </p>
          )}

          <div className="flex gap-2.5 pt-2">
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Enrolled Courses ({u.courseAccess.length})
          </p>
          {u.courseAccess.length === 0 ? (
            <p className="text-sm text-slate-500">None</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {u.courseAccess.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/70 p-2.5 dark:border-white/10 dark:bg-slate-900"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      {c.course.title}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {naira(c.paidAmount)} / {naira(c.course.fullPrice)} {c.isFullyPaid ? '(Full)' : '(50%)'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    className="px-2 py-1 text-xs shrink-0"
                    loading={unenroll.isPending && unenroll.variables === (c.course.id || c.courseId)}
                    onClick={() => {
                      if (
                        confirm(
                          `Remove ${u.fullName} from ${c.course.title}? Their classroom access and lesson progress will be revoked.`
                        )
                      ) {
                        unenroll.mutate(c.course.id || c.courseId);
                      }
                    }}
                    title="Unenroll student"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Unenroll</span>
                  </Button>
                </li>
              ))}
            </ul>
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
  const qc = useQueryClient();
  const [tab, setTab] = useState<'members' | 'invites'>('members');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users', debounced],
    queryFn: () => api<Row[]>(`/admin/users?q=${encodeURIComponent(debounced)}`),
  });

  const { data: invitesData, isLoading: invitesLoading } = useQuery({
    queryKey: ['admin', 'invites'],
    queryFn: () => api<{ items: AdminInvite[] }>('/admin/invites'),
  });

  const resendInvite = useMutation({
    mutationFn: (id: string) => api<{ ok: boolean; invite: AdminInvite }>(`/admin/invites/${id}/resend`, { method: 'POST', body: {} }),
    onSuccess: (res) => {
      toast.success('Invitation Resent', `A fresh invitation link was sent to ${res.invite.email}`);
      qc.invalidateQueries({ queryKey: ['admin', 'invites'] });
    },
    onError: (e) => toast.error('Failed to resend invite', errorMessage(e)),
  });

  const revokeInvite = useMutation({
    mutationFn: (id: string) => api<{ ok: boolean }>(`/admin/invites/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.info('Invitation Revoked', 'The pending admin invitation has been revoked.');
      qc.invalidateQueries({ queryKey: ['admin', 'invites'] });
    },
    onError: (e) => toast.error('Failed to revoke invite', errorMessage(e)),
  });

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/admin/accept-invite?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.info('Link Copied', 'Invitation URL copied to clipboard.');
  };

  const invites = invitesData?.items || [];
  const pendingCount = invites.filter((i) => i.status === 'PENDING').length;

  const filteredInvites = invites.filter(
    (i) =>
      !debounced ||
      i.fullName.toLowerCase().includes(debounced.toLowerCase()) ||
      i.email.toLowerCase().includes(debounced.toLowerCase())
  );

  return (
    <>
      <PageHeader
        eyebrow="User Directory"
        title="Members & Team Control"
        subtitle="Manage member profiles, account verification, and invite administrators to the command team."
        actions={
          <Button variant="primary" onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4" /> Invite Administrator
          </Button>
        }
      />

      {/* Segmented Tab Controls & Search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-full border border-slate-200 bg-slate-100/70 p-1 dark:border-white/10 dark:bg-white/5">
          <button
            type="button"
            onClick={() => setTab('members')}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-semibold transition',
              tab === 'members'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            )}
          >
            All Members ({users?.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setTab('invites')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition',
              tab === 'invites'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            )}
          >
            <span>Admin Invitations</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="field rounded-full pl-10"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tab === 'members' ? 'Search member name or email' : 'Search invitation name or email'}
            aria-label="Search"
          />
        </div>
      </div>

      {/* Tab: Members Table */}
      {tab === 'members' && (
        <Card variant="bento" className="overflow-x-auto p-0 sm:p-0">
          {usersLoading ? (
            <Loading />
          ) : (
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Tier</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Verification</th>
                  <th className="px-5 py-3">Account</th>
                  <th className="px-5 py-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {users?.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelected(u.id)}
                    className="cursor-pointer transition hover:bg-cyan-500/5"
                  >
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-3">
                        <Avatar name={u.fullName} size="sm" online={u.online} />
                        <div>
                          <span className="font-semibold block leading-tight">{u.fullName}</span>
                          {u.role === 'ADMIN' && (
                            <span className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">
                              @{u.username || 'admin'}
                            </span>
                          )}
                        </div>
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
      )}

      {/* Tab: Admin Invitations */}
      {tab === 'invites' && (
        <Card variant="bento" className="overflow-x-auto p-0 sm:p-0">
          {invitesLoading ? (
            <Loading />
          ) : filteredInvites.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="mx-auto h-10 w-10 text-slate-400 mb-3" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">No invitations found</p>
              <p className="mt-1 text-xs text-slate-500">
                {debounced ? 'No invitations matched your search query.' : 'No administrators have been invited yet.'}
              </p>
              <Button variant="primary" size="sm" className="mt-4" onClick={() => setInviteModalOpen(true)}>
                <UserPlus className="h-4 w-4" /> Invite Administrator
              </Button>
            </div>
          ) : (
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Invitee</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Sent</th>
                  <th className="px-5 py-3">Expires / Valid Until</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {filteredInvites.map((inv) => {
                  const isExpired = inv.status === 'EXPIRED' || (inv.status === 'PENDING' && new Date(inv.expiresAt) < new Date());
                  return (
                    <tr key={inv.id} className="transition hover:bg-cyan-500/5">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={inv.fullName} size="sm" />
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white leading-tight">{inv.fullName}</p>
                            <p className="text-xs text-slate-500">{inv.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={isExpired && inv.status === 'PENDING' ? 'EXPIRED' : inv.status} />
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {formatDateTime(inv.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {inv.status === 'ACCEPTED' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Joined Team</span>
                        ) : isExpired ? (
                          <span className="text-rose-500 font-medium">Expired</span>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-300 font-mono">
                            {timeAgo(inv.expiresAt)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status === 'PENDING' && !isExpired && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="px-2 py-1 text-xs"
                              title="Copy Direct Setup Link"
                              onClick={() => copyInviteLink(inv.token)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Copy Link</span>
                            </Button>
                          )}
                          {inv.status !== 'ACCEPTED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="px-2 py-1 text-xs"
                              title="Resend Invitation Email"
                              loading={resendInvite.isPending}
                              onClick={() => resendInvite.mutate(inv.id)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Resend</span>
                            </Button>
                          )}
                          {inv.status === 'PENDING' && (
                            <Button
                              size="sm"
                              variant="danger"
                              className="px-2 py-1 text-xs"
                              title="Revoke Invitation"
                              loading={revokeInvite.isPending}
                              onClick={() => {
                                if (confirm(`Revoke administrator invitation for ${inv.fullName}?`)) {
                                  revokeInvite.mutate(inv.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Revoke</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Invite Admin Modal */}
      <InviteAdminModal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />

      {/* User Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Member profile" wide>
        {selected && <UserPanel id={selected} onClose={() => setSelected(null)} />}
      </Modal>
    </>
  );
}
