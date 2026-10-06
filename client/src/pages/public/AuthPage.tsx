import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button, Field, Logo, ThemeToggle } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import type { User } from '../../lib/types';
import { useAuth } from '../../store/auth';

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { token, user, setSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const destination = (u: User) => {
    const next = params.get('next');
    if (next?.startsWith('/admin') && u.role !== 'ADMIN') return '/app';
    return next ?? (u.role === 'ADMIN' ? '/admin' : '/app');
  };

  if (token && user) return <Navigate to={destination(user)} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body = mode === 'login' ? { email: form.email, password: form.password } : { ...form, phone: form.phone || undefined };
      const res = await api<{ token: string; user: User }>(`/auth/${mode}`, { body });
      setSession(res.token, res.user);
      navigate(destination(res.user), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-16">
      <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="absolute left-1/2 top-1/3 h-80 w-[560px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-cyan-600 dark:text-slate-300">
          <ArrowLeft className="h-4 w-4" /> Back to site
        </Link>
        <ThemeToggle />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass relative w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-bold">{mode === 'login' ? 'Sign in to L.E.G.I.T OS' : 'Join the Hub'}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === 'login' ? 'Access your terminal, bookings and classrooms.' : 'Create your free Pay-As-You-Go membership in seconds.'}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'register' && (
            <>
              <Field label="Full name"><input className="field" required minLength={2} value={form.fullName} onChange={set('fullName')} autoComplete="name" /></Field>
              <Field label="Phone (optional)"><input className="field" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="+234…" /></Field>
            </>
          )}
          <Field label="Email"><input className="field" type="email" required value={form.email} onChange={set('email')} autoComplete="email" /></Field>
          <Field label="Password" hint={mode === 'register' ? 'At least 8 characters.' : undefined}>
            <input className="field" type="password" required minLength={mode === 'register' ? 8 : 1} value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </Field>
          {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400" role="alert">{error}</p>}
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === 'login' ? (
            <>New here? <Link to="/register" className="font-semibold text-cyan-600 hover:underline">Join the Hub</Link></>
          ) : (
            <>Already a member? <Link to="/login" className="font-semibold text-cyan-600 hover:underline">Sign in</Link></>
          )}
        </p>
        {mode === 'login' && import.meta.env.DEV && (
          <p className="mt-4 rounded-2xl border border-dashed border-cyan-500/40 p-3 font-mono text-[11px] leading-relaxed text-slate-500">
            demo@legithub.com / Demo@12345<br />admin@legithub.com / Admin@12345
          </p>
        )}
      </motion.div>
    </div>
  );
}
