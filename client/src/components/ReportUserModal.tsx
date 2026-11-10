import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from './ui';

interface ReportUserModalProps {
  open: boolean;
  onClose: () => void;
  targetUser: {
    id: string;
    fullName: string;
  } | null;
}

const REPORT_REASONS = [
  'Harassment or Bullying',
  'Spam, Promotion or Scam',
  'Inappropriate or Offensive Messages',
  'Impersonation or Fake Identity',
  'Suspicious Activity',
  'Other Policy Violation',
];

export function ReportUserModal({ open, onClose, targetUser }: ReportUserModalProps) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !targetUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api('/network/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: targetUser.id,
          reason,
          details: details.trim() || undefined,
        }),
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setDetails('');
        onClose();
      }, 2000);
    } catch (err) {
      setError((err as Error).message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200"
        >
          <button
            onClick={onClose}
            className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>

          {submitted ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Report Submitted</h3>
              <p className="mt-1 text-sm text-slate-500">
                Our hub moderation team has been alerted and will investigate @{targetUser.fullName}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 shrink-0">
                  <Flag className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">Report User</h3>
                  <p className="text-xs text-slate-500">
                    Reporting <strong>{targetUser.fullName}</strong> to hub administrators
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-2xl bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 border border-rose-500/20">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Reason for report
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="field w-full rounded-2xl text-xs py-2.5"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide context or describe what happened..."
                  rows={3}
                  className="field w-full rounded-2xl text-xs p-3 resize-none"
                  maxLength={1000}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" size="sm" loading={loading}>
                  Submit Report
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
