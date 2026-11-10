import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Award, Flame, ShieldCheck, Trophy } from 'lucide-react';
import { Avatar, Badge, Button, Card, Field, PageHeader, cn } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDate, tierLabel } from '../../lib/format';
import type { User } from '../../lib/types';
import { useAuth } from '../../store/auth';
import { toast } from '../../store/toast';

const BADGES = [
  { name: 'New Member', points: 0 },
  { name: 'Rising Innovator', points: 150 },
  { name: 'Power Builder', points: 500 },
  { name: 'Hub Legend', points: 1000 },
];

export default function Profile() {
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

  const dirty = form.fullName !== u.fullName || form.phone !== (u.phone ?? "") || form.bio !== (u.bio ?? "");
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
        <Card variant="bento" className="relative overflow-hidden lg:col-span-2">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-blue-600 to-blue-500 sm:h-32" />
          <div className="relative pt-12 sm:pt-16">
            <Avatar name={u.fullName} size="lg" />
            <p className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-blue-600">Command Center Identity</p>
            <h2 className="font-display text-2xl font-bold text-slate-900">{u.fullName}</h2>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Badge tone="blue">Tier: {tierLabel(u.tier)}</Badge>
              {u.verified && <Badge tone="green"><ShieldCheck className="h-3 w-3" /> Verified Member</Badge>}
              <Badge>Joined {formatDate(u.createdAt)}</Badge>
            </div>
          </div>
          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><input className="field font-medium" autoComplete="name" required minLength={2} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
            <Field label="Phone"><input className="field font-medium" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Field label="Bio"><textarea className="field min-h-24 leading-relaxed" maxLength={300} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="What are you building at L.E.G.I.T Innovation Hub?" /></Field>
            </div>
            <div className="flex flex-col-reverse items-stretch gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-end">
              {dirty && <span className="text-center text-xs font-medium text-amber-600 sm:mr-auto">You have unsaved changes</span>}
              <Button type="submit" loading={save.isPending} disabled={!dirty} className="max-sm:w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/25 transition-colors">
                Save profile
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card variant="bento">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#155dfd]"><Trophy className="h-4 w-4 text-[#155dfd]" /> Hub Rewards & Badges</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-4">
                <p className="font-mono text-3xl font-extrabold text-slate-900">{u.points}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Reward Points</p>
              </div>
              <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-4">
                <p className="flex items-center gap-1 font-mono text-3xl font-extrabold text-slate-900">{u.streakDays}<Flame className="h-5 w-5 text-[#155dfd]" /></p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Day Streak</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs font-medium text-slate-500">
                <span>{prev.name}</span>
                <span className="font-mono">{next ? `${next.points - u.points} pts to ${next.name}` : 'Max level achieved'}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-[#155dfd] shadow-[0_0_8px_rgba(21,93,253,0.4)] transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Unlocked Badges</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {BADGES.map((b) => {
                const earned = u.points >= b.points;
                return (
                  <span
                    key={b.name}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                      earned ? 'bg-blue-500/10 text-blue-700 border border-blue-500/30 shadow-xs' : 'bg-slate-100 text-slate-400 opacity-50'
                    )}
                  >
                    <Award className="h-3.5 w-3.5" /> {b.name}
                  </span>
                );
              })}
            </div>
            <p className="mt-4 text-[11px] text-slate-400 leading-normal">Earn 5 points per daily check-in and 50 points per verified facility booking or course enrollment.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
