import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button, Field, Logo } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import type { User } from '../../lib/types';
import { useAuth } from '../../store/auth';

export default function AdminLogin() {
  const { token, user, setSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '', rememberMe: true });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(
    params.get('error') === 'unauthorized' ? 'Access restricted: Your account does not have administrator privileges.' : ''
  );
  const [loading, setLoading] = useState(false);

  // If already logged in as ADMIN, direct to /admin
  if (token && user && user.role === 'ADMIN') {
    const next = params.get('next');
    return <Navigate to={next && next.startsWith('/admin') ? next : '/admin'} replace />;
  }

  const quickFillAdmin = () => {
    setForm({
      email: 'admin@legithub.com',
      password: 'Admin@12345',
      rememberMe: true,
    });
    setError('');
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api<{ token: string; user: User }>('/auth/login', {
        body: { email: form.email, password: form.password, rememberMe: form.rememberMe },
      });

      if (res.user.role !== 'ADMIN') {
        setError('Access denied: This login gateway is reserved for administrators only.');
        setLoading(false);
        return;
      }

      setSession(res.token, res.user);
      const next = params.get('next');
      navigate(next && next.startsWith('/admin') ? next : '/admin', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-16">
      <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="absolute left-1/2 top-1/3 h-80 w-[560px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[120px]" />

      <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-cyan-600 dark:text-slate-300">
          <ArrowLeft className="h-4 w-4" /> Back to site
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass relative w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-bold">Sign in to Admin Command Center</h1>
        <p className="mt-1 text-sm text-slate-500">
          Access hub operations, fleet inventory, pricing and audit logs.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Email">
            <input
              className="field"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              placeholder="admin@legithub.com"
            />
          </Field>

          <Field label="Password">
            <div className="relative">
              <input
                className="field pr-10"
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                className="h-4 w-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
                checked={form.rememberMe}
                onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })}
              />
              <label htmlFor="rememberMe" className="text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                Remember me
              </label>
            </div>

            <button
              type="button"
              onClick={quickFillAdmin}
              className="text-xs font-mono text-cyan-600 hover:underline"
            >
              Fill demo credentials
            </button>
          </div>

          {error && (
            <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 animate-in fade-in" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Sign in
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
