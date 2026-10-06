import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Check, Crown, Flame, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { Avatar, Badge, Button, Card, Field, PageHeader, cn } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDate, naira, tierLabel } from '../../lib/format';
import type { Invoice, User } from '../../lib/types';
import { useAuth } from '../../store/auth';
import { toast } from '../../store/toast';

const BADGES = [
  { name: 'New Member', points: 0 },
  { name: 'Rising Innovator', points: 150 },
  { name: 'Power Builder', points: 500 },
  { name: 'Hub Legend', points: 1000 },
];

const PRO_PERKS = ['Priority desk reservations', 'Discounted facility rates', 'Free lounge drink daily', 'Members-only events & mentor hours'];

export default function Profile() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const u = user!;
  const [form, setForm] = useState({ fullName: u.fullName, phone: u.phone ?? '', bio: u.bio ?? '' });

  const save = useMutation({
    mutationFn: () => api<{ user: User }>('/profile', { method: 'PATCH', body: form }),
    onSuccess: (r) => {
      setUser(r.user);
      toast.success('Profile saved');
    },
    onError: (e) => toast.error('Could not save', errorMessage(e)),
  });
  const upgrade = useMutation({
    mutationFn: () => api<Invoice>('/finance/subscribe', { body: { tier: 'PRO_MONTHLY' } }),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ['finance'] });
      navigate(`/app/finance?invoice=${inv.id}`);
    },
    onError: (e) => toast.error('Upgrade failed', errorMessage(e)),
  });

  const next = BADGES.find((b) => b.points > u.points);
  const prev = [...BADGES].reverse().find((b) => b.points <= u.points)!;
  const pct = next ? Math.round(((u.points - prev.points) / (next.points - prev.points)) * 100) : 100;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <>
      <PageHeader eyebrow="Profile" title="Your identity" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden lg:col-span-2">
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-cyan-500 via-sky-600 to-blue-700" />
          <div className="relative pt-14">
            <Avatar name={u.fullName} size="lg" />
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-400">Command Center VIP</p>
            <h2 className="font-display text-2xl font-bold">{u.fullName}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="cyan">Tier: {tierLabel(u.tier)}</Badge>
              {u.verified && <Badge tone="green"><ShieldCheck className="h-3 w-3" /> Verified</Badge>}
              <Badge>Member since {formatDate(u.createdAt)}</Badge>
            </div>
          </div>
          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><input className="field" required minLength={2} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
            <Field label="Phone"><input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Field label="Bio"><textarea className="field min-h-24" maxLength={300} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="What are you building?" /></Field>
            </div>
            <div className="sm:col-span-2 flex justify-end"><Button type="submit" loading={save.isPending}>Save profile</Button></div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Trophy className="h-4 w-4 text-amber-500" /> Hub Rewards</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-amber-500/10 p-4"><p className="font-display text-3xl font-bold">{u.points}</p><p className="text-xs text-slate-500">Points</p></div>
              <div className="rounded-2xl bg-orange-500/10 p-4"><p className="flex items-center gap-1 font-display text-3xl font-bold">{u.streakDays}<Flame className="h-5 w-5 text-orange-500" /></p><p className="text-xs text-slate-500">Day streak</p></div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500"><span>{prev.name}</span><span>{next ? `${next.points - u.points} pts to ${next.name}` : 'Max level'}</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${pct}%` }} /></div>
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Badges</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {BADGES.map((b) => {
                const earned = u.points >= b.points;
                return (
                  <span key={b.name} className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', earned ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' : 'bg-slate-100 text-slate-400 dark:bg-white/5')}>
                    <Award className="h-3.5 w-3.5" /> {b.name}
                  </span>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-slate-500">Earn 5 points per daily visit and 50 per verified payment.</p>
          </Card>

          <Card className="relative overflow-hidden border-cyan-500/30">
            <Sparkles className="absolute -right-4 -top-4 h-24 w-24 text-cyan-500/10" />
            <p className="flex items-center gap-2 font-display text-lg font-bold"><Crown className="h-5 w-5 text-amber-500" /> Pro Membership</p>
            <p className="mt-1 font-display text-3xl font-bold">{naira(60000)}<span className="text-sm font-normal text-slate-500">/month</span></p>
            <ul className="mt-4 space-y-2 text-sm">
              {PRO_PERKS.map((p) => <li key={p} className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-500" /> {p}</li>)}
            </ul>
            {u.tier === 'PAY_AS_YOU_GO' ? (
              <Button className="mt-5 w-full" loading={upgrade.isPending} onClick={() => upgrade.mutate()}>Upgrade to Pro</Button>
            ) : (
              <p className="mt-5 rounded-full bg-emerald-500/10 py-2.5 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                You're on {tierLabel(u.tier)}{u.planRenewsAt ? ` · renews ${formatDate(u.planRenewsAt)}` : ''}
              </p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
