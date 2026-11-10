import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Loader2, X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useToasts } from '../store/toast';
import { humanize } from '../lib/format';

export const cn = clsx;

export function Card({
  className,
  variant = 'glass',
  children,
}: {
  className?: string;
  variant?: 'glass' | 'bento' | 'terminal';
  children: ReactNode;
}) {
  const base =
    variant === 'bento'
      ? 'bento-card'
      : variant === 'terminal'
      ? 'terminal-bezel p-5 sm:p-6'
      : 'glass p-5 sm:p-6';
  return <div className={cn(base, className)}>{children}</div>;
}

type Variant = 'primary' | 'outline' | 'ghost' | 'danger' | 'success';
const variants: Record<Variant, string> = {
  primary:
    'bg-blue-600 text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-[0.98] focus:ring-4 focus:ring-blue-500/25',
  outline:
    'border border-slate-300 bg-white/80 text-slate-700 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/50 active:scale-[0.98]',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger:
    'border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 active:scale-[0.98]',
  success:
    'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 active:scale-[0.98]',
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
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none',
        size === 'sm' && 'min-h-9 px-3.5 py-1.5 text-xs',
        size === 'md' && 'min-h-11 px-5 py-2.5 text-sm',
        size === 'lg' && 'px-7 py-3.5 text-base tracking-wide',
        variants[variant],
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const tones = {
  slate: 'border border-slate-300/60 bg-slate-500/10 text-slate-700',
  cyan: 'border border-blue-500/30 bg-blue-50 text-blue-700',
  blue: 'border border-blue-500/30 bg-blue-50 text-blue-700',
  green: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700',
  amber: 'border border-amber-500/30 bg-amber-500/15 text-amber-700',
  red: 'border border-rose-500/30 bg-rose-500/10 text-rose-600',
  violet: 'border border-violet-500/30 bg-violet-500/10 text-violet-700',
};
export type Tone = keyof typeof tones;

export function Badge({ tone = 'slate', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider', tones[tone], className)}>
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
        {eyebrow && <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 max-sm:[&>*]:flex-1">{actions}</div>}
    </div>
  );
}

export function Empty({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-slate-500">
      {icon && <div className="text-slate-400">{icon}</div>}
      <p className="font-semibold text-slate-700">{title}</p>
      {hint && <p className="max-w-xs text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="mx-auto w-full max-w-2xl py-8 sm:py-12">
      <SkeletonList rows={3} />
      <p className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
        <span>{label}</span>
      </p>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Bottom sheet on phones, centred dialog from sm up
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'safe-bottom relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-h-[90dvh] sm:rounded-3xl sm:p-6',
              wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
            )}
            initial={{ y: 40, opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div aria-hidden className="mx-auto -mt-1 mb-3 h-1 w-10 rounded-full bg-slate-300 sm:hidden" />
            <div className="sticky -top-5 z-10 -mx-5 -mt-1 mb-4 flex items-center justify-between gap-4 border-b border-slate-100 bg-inherit px-5 pb-3 sm:static sm:mx-0 sm:mt-0 sm:px-0">
              <h2 className="font-display text-lg font-bold text-slate-900">{title}</h2>
              <button
                onClick={onClose}
                className="tap cursor-pointer rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
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
          'inline-flex items-center justify-center rounded-full bg-blue-600 font-bold text-white shadow-sm',
          size === 'sm' && 'h-8 w-8 text-xs',
          size === 'md' && 'h-10 w-10 text-sm',
          size === 'lg' && 'h-16 w-16 text-xl',
        )}
      >
        {letters}
      </span>
      {online !== undefined && (
        <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white', online ? 'bg-emerald-500' : 'bg-slate-400')} />
      )}
    </span>
  );
}

export function StatCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="relative overflow-hidden group hover:border-blue-500/40 transition-all duration-300">
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue-500/10 blur-2xl transition-all duration-500 group-hover:bg-blue-500/20" />
      <div className="flex items-center gap-3 text-slate-500">
        <span className="rounded-2xl bg-blue-50 text-blue-600 p-2.5 transition-colors group-hover:bg-blue-500/20">
          {icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight sm:mt-4 sm:text-3xl text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  const icon = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />,
    error: <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />,
    info: <Info className="h-5 w-5 text-cyan-400 shrink-0" />,
  };
  return (
    <div className="pointer-events-none fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[60] lg:bottom-4 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            className="glass pointer-events-auto flex items-start gap-3 border border-slate-200 bg-white/95 p-4 shadow-xl"
          >
            {icon[t.tone]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              {t.body && <p className="mt-0.5 text-sm text-slate-500">{t.body}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Dismiss">
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
    <div role="tablist" className="no-scrollbar -mx-4 flex max-w-[100vw] gap-1 overflow-x-auto px-4 sm:mx-0 sm:inline-flex sm:max-w-full sm:rounded-full sm:border sm:border-slate-200 sm:bg-white/70 sm:p-1 sm:px-1 sm:backdrop-blur-md">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'tap shrink-0 cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 max-sm:border max-sm:border-slate-200 sm:py-1.5',
            value === o.value
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 hover:text-blue-600',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Shimmering placeholder block; compose to mirror the layout being loaded. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-2xl', className)} />;
}

/** Drop-in loading state that previews a list of rows instead of a bare spinner. */
export function SkeletonList({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
