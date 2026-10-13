import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Loader2, X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useToasts } from '../store/toast';
import { humanize } from '../lib/format';

export const cn = clsx;

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('glass p-5 sm:p-6', className)}>{children}</div>;
}

type Variant = 'primary' | 'outline' | 'ghost' | 'danger' | 'success';
const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:brightness-110',
  outline:
    'border border-slate-300 text-slate-700 hover:border-cyan-500 hover:text-cyan-600 dark:border-white/15 dark:text-slate-200 dark:hover:text-cyan-300',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5',
  danger: 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400',
  success: 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' && 'px-3.5 py-1.5 text-xs',
        size === 'md' && 'px-5 py-2.5 text-sm',
        size === 'lg' && 'px-7 py-3.5 text-base',
        variants[variant],
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const tones = {
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  cyan: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  green: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  red: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
};
export type Tone = keyof typeof tones;

export function Badge({ tone = 'slate', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide', tones[tone], className)}>
      {children}
    </span>
  );
}

const statusTone: Record<string, Tone> = {
  PAID: 'green', APPROVED: 'green', CONFIRMED: 'green', ACTIVE: 'cyan', COMPLETED: 'slate', DELIVERED: 'slate', CLEAR: 'green',
  PENDING: 'amber', PENDING_PAYMENT: 'amber', OUTSTANDING: 'amber', PLACED: 'amber', REQUESTED: 'amber',
  AWAITING_REVIEW: 'blue', PREPARING: 'blue', ASSIGNED: 'blue', EN_ROUTE: 'violet', READY: 'violet',
  REJECTED: 'red', CANCELLED: 'red', VOID: 'slate', SUSPENDED: 'amber', BANNED: 'red',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone[status] ?? 'slate'}>{humanize(status)}</Badge>;
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-400">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-slate-500">
      {icon && <div className="text-slate-400 dark:text-slate-600">{icon}</div>}
      <p className="font-semibold text-slate-700 dark:text-slate-300">{title}</p>
      {hint && <p className="max-w-xs text-sm">{hint}</p>}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin text-cyan-500" /> {label}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn('glass max-h-[90vh] w-full overflow-y-auto bg-white p-6 dark:bg-slate-900/95', wide ? 'max-w-3xl' : 'max-w-lg')}
            initial={{ y: 24, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 24, scale: 0.97 }}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="font-display text-lg font-bold">{title}</h2>
              <button onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <span className="inline-flex items-center justify-center shrink-0">
        <img src="/logo-icon.png" alt="L.E.G.I.T Innovation Hub" className={cn('h-8 w-8 object-contain', className)} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center shrink-0">
      <img src="/logo.png" alt="L.E.G.I.T Innovation Hub" className={cn('h-10 w-auto object-contain', className)} />
    </span>
  );
}

export function Avatar({ name, size = 'md', online }: { name: string; size?: 'sm' | 'md' | 'lg'; online?: boolean }) {
  const letters = name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return (
    <span className="relative inline-flex shrink-0">
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 font-bold text-white',
          size === 'sm' && 'h-8 w-8 text-xs',
          size === 'md' && 'h-10 w-10 text-sm',
          size === 'lg' && 'h-16 w-16 text-xl',
        )}
      >
        {letters}
      </span>
      {online !== undefined && (
        <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900', online ? 'bg-emerald-500' : 'bg-slate-400')} />
      )}
    </span>
  );
}

export function StatCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
      <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
        <span className="rounded-2xl bg-cyan-500/10 p-2.5 text-cyan-600 dark:text-cyan-400">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-4 font-display text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  const icon = { success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />, error: <AlertTriangle className="h-5 w-5 text-rose-500" />, info: <Info className="h-5 w-5 text-cyan-500" /> };
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            className="glass pointer-events-auto flex items-start gap-3 bg-white/95 p-4 shadow-xl dark:bg-slate-900/95"
          >
            {icon[t.tone]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.body && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t.body}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Horizontal segmented tabs used for category filters. */
export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full border border-slate-200 bg-white/60 p-1 dark:border-white/10 dark:bg-white/5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-semibold transition',
            value === o.value ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow' : 'text-slate-600 hover:text-cyan-600 dark:text-slate-300',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
