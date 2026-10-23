import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button, Card, Field, Loading, Logo } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import type { User } from '../../lib/types';
import { useAuth } from '../../store/auth';
import { toast } from '../../store/toast';

interface InviteInfo {
  ok: boolean;
  email: string;
  fullName: string;
  inviterName: string;
  suggestedUsername: string;
  expiresAt: string;
}

export default function AcceptAdminInvite() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Validate token with backend
  const { data: invite, isLoading, error } = useQuery<InviteInfo>({
    queryKey: ['admin-invite', token],
    queryFn: () => api<InviteInfo>(`/auth/invite/${encodeURIComponent(token)}`),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  });

  // Prefill suggested username when query resolves
  const currentUsername = username || invite?.suggestedUsername || '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please check and try again.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api<{ ok: boolean; token: string; user: User }>('/auth/accept-invite', {
        method: 'POST',
        body: {
          token,
          password,
          username: currentUsername.trim().toLowerCase(),
        },
      });

      setSession(res.token, res.user);
      toast.success('Administrator Account Activated', `Welcome to the command team, ${res.user.fullName}!`);
      navigate(`/admin/${res.user.username || 'admin'}`, { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
        <Card className="max-w-md p-8 text-center border-rose-500/30 bg-slate-900/90 shadow-2xl">
          <ShieldAlert className="mx-auto h-12 w-12 text-rose-500 mb-4" />
          <h1 className="font-display text-2xl font-bold">Missing Invitation Token</h1>
          <p className="mt-2 text-sm text-slate-400">
            This invitation link is incomplete or missing a valid security token. Please check the link in your email.
          </p>
          <Link to="/admin/login" className="mt-6 inline-block">
            <Button variant="ghost">Return to Admin Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <Loading label="Verifying administrator security token…" />;
  }

  if (error || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
        <Card className="max-w-md p-8 text-center border-rose-500/30 bg-slate-900/90 shadow-2xl">
          <ShieldAlert className="mx-auto h-12 w-12 text-rose-500 mb-4" />
          <h1 className="font-display text-2xl font-bold">Invitation Invalid or Expired</h1>
          <p className="mt-2 text-sm text-slate-400">
            {errorMessage(error) || 'This administrator invitation is invalid, has expired, or was already accepted.'}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/admin/login">
              <Button className="w-full">Go to Admin Login</Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" className="w-full">Back to Home</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-12 text-slate-100 sm:px-6">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[130px]" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[130px]" />

      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-blue-400 transition">
            <ArrowLeft className="h-4 w-4" /> Back to hub
          </Link>
          <Logo />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
        >
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold text-blue-400">
              <ShieldCheck className="h-4 w-4" />
              <span>OFFICIAL ADMIN INVITATION</span>
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Accept Admin Privileges
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Invited by <span className="font-semibold text-white">{invite.inviterName}</span> to join the L.E.G.I.T Innovation Hub Administrator Command Team.
            </p>
          </div>

          <div className="mb-6 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Appointee:</span>
              <span className="font-semibold text-slate-200">{invite.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Admin Email:</span>
              <span className="font-mono text-blue-400">{invite.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Privilege Level:</span>
              <span className="font-semibold text-emerald-400">FULL HUB ADMINISTRATOR (No KYC Needed)</span>
            </div>
          </div>

          {formError && (
            <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-sm text-rose-300">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Personal Dashboard URL Handle" hint="Your custom admin route slug in the address bar">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500 select-none">
                  /admin/
                </span>
                <input
                  type="text"
                  required
                  value={currentUsername}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="your-name"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3 pl-20 pr-4 font-mono text-sm text-blue-300 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <p className="mt-1 font-mono text-[11px] text-slate-400">
                Your portal will load at: <span className="text-blue-400 font-bold">/admin/{currentUsername || 'handle'}</span>
              </p>
            </Field>

            <Field label="Create Administrator Password" hint="Minimum 8 characters">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 pr-11 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Field label="Confirm Password">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </Field>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={submitting || !password || !confirmPassword}
                className="w-full justify-center bg-blue-600 hover:bg-blue-700 py-3.5 text-sm font-bold shadow-lg shadow-blue-500/25 transition-colors"
              >
                {submitting ? (
                  'Activating Command Account…'
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" /> Complete Setup & Enter Command Center
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
