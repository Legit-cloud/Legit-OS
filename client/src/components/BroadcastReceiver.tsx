import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  BellRing,
  X,
  ExternalLink,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api';
import { useSocketEvent } from '../lib/socket';
import type { BroadcastEntry } from '../lib/types';

const DISMISSED_KEY = 'legit_dismissed_broadcasts';

function getDismissedIds(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markDismissed(id: string) {
  try {
    const existing = getDismissedIds();
    if (!existing.includes(id)) {
      existing.push(id);
      // Keep only last 100 dismissed IDs
      if (existing.length > 100) existing.shift();
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(existing));
    }
  } catch {
    // ignore
  }
}

export function triggerPopup(entry: BroadcastEntry) {
  window.dispatchEvent(new CustomEvent('legit:open-popup', { detail: entry }));
}

export function BroadcastReceiver() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [popupQueue, setPopupQueue] = useState<BroadcastEntry[]>([]);
  const [activeBanner, setActiveBanner] = useState<BroadcastEntry | null>(null);

  // Load recent active broadcasts from server (delivers offline popups/banners)
  const activeQuery = useQuery({
    queryKey: ['comms', 'active'],
    queryFn: () => api<BroadcastEntry[]>('/comms/active'),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!activeQuery.data) return;
    const dismissed = getDismissedIds();
    const unacknowledgedPopups = activeQuery.data.filter(
      (b) => (b.type === 'POPUP' || b.type === 'COMBO') && !dismissed.includes(b.id),
    );
    const unacknowledgedBanners = activeQuery.data.filter(
      (b) => b.type === 'BANNER' && !dismissed.includes(b.id),
    );

    if (unacknowledgedPopups.length > 0) {
      setPopupQueue((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const toAdd = unacknowledgedPopups.filter((p) => !existingIds.has(p.id));
        return [...prev, ...toAdd];
      });
    }

    if (unacknowledgedBanners.length > 0) {
      setActiveBanner((prev) => prev ?? unacknowledgedBanners[0]);
    }
  }, [activeQuery.data]);

  // Listen to manual triggers (e.g. from Notifications page "View Popup" button)
  useEffect(() => {
    const handleManualPopup = (e: Event) => {
      const customEvent = e as CustomEvent<BroadcastEntry>;
      if (customEvent.detail) {
        setPopupQueue((prev) => [customEvent.detail, ...prev.filter((p) => p.id !== customEvent.detail.id)]);
      }
    };
    window.addEventListener('legit:open-popup', handleManualPopup);
    return () => window.removeEventListener('legit:open-popup', handleManualPopup);
  }, []);

  // Real-time socket events
  useSocketEvent<BroadcastEntry>('broadcast:popup', (entry) => {
    const dismissed = getDismissedIds();
    if (!dismissed.includes(entry.id)) {
      setPopupQueue((prev) => {
        if (prev.some((p) => p.id === entry.id)) return prev;
        return [entry, ...prev];
      });
    }
  });

  useSocketEvent<BroadcastEntry>('broadcast:banner', (entry) => {
    const dismissed = getDismissedIds();
    if (!dismissed.includes(entry.id)) {
      setActiveBanner(entry);
    }
  });

  useSocketEvent<{ id: string }>('broadcast:recalled', (data) => {
    setActiveBanner((prev) => (prev?.id === data.id ? null : prev));
    setPopupQueue((prev) => prev.filter((p) => p.id !== data.id));
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['comms'] });
  });

  const currentPopup = popupQueue[0] || null;

  const dismissPopup = (id: string) => {
    markDismissed(id);
    api(`/comms/broadcast/${id}/ack`, { method: 'POST' }).catch(() => undefined);
    setPopupQueue((prev) => prev.filter((p) => p.id !== id));
  };

  const dismissBanner = (id: string) => {
    markDismissed(id);
    api(`/comms/broadcast/${id}/ack`, { method: 'POST' }).catch(() => undefined);
    setActiveBanner(null);
  };

  const handleActionClick = (url?: string, broadcastId?: string) => {
    if (broadcastId) {
      markDismissed(broadcastId);
      api(`/comms/broadcast/${broadcastId}/ack`, { method: 'POST' }).catch(() => undefined);
      setPopupQueue((prev) => prev.filter((p) => p.id !== broadcastId));
      if (activeBanner?.id === broadcastId) setActiveBanner(null);
    }
    if (!url) return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(url);
    }
  };

  const getSeverityStyle = (severity: BroadcastEntry['severity']) => {
    switch (severity) {
      case 'URGENT':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-950 dark:text-rose-100',
          badge: 'bg-rose-600 text-white shadow-rose-500/30',
          icon: <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />,
          accent: 'from-rose-500 to-red-600',
          ring: 'ring-rose-500/30',
          label: 'Urgent Announcement',
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-950 dark:text-amber-100',
          badge: 'bg-amber-500 text-white shadow-amber-500/30',
          icon: <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
          accent: 'from-amber-500 to-orange-500',
          ring: 'ring-amber-500/30',
          label: 'Important Advisory',
        };
      case 'SUCCESS':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-100',
          badge: 'bg-emerald-600 text-white shadow-emerald-500/30',
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
          accent: 'from-emerald-500 to-teal-600',
          ring: 'ring-emerald-500/30',
          label: 'Good News & Update',
        };
      case 'INFO':
      default:
        return {
          bg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-900/50 text-cyan-950 dark:text-cyan-100',
          badge: 'bg-cyan-600 text-white shadow-cyan-500/30',
          icon: <BellRing className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />,
          accent: 'from-cyan-500 to-blue-600',
          ring: 'ring-cyan-500/30',
          label: 'Hub Announcement',
        };
    }
  };

  return (
    <>
      {/* ── Top Announcement Banner ── */}
      <AnimatePresence>
        {activeBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative z-40 overflow-hidden"
          >
            {(() => {
              const style = getSeverityStyle(activeBanner.severity);
              return (
                <div
                  className={`border-b px-4 py-2.5 text-xs sm:text-sm font-medium ${style.bg} transition-colors`}
                >
                  <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex-shrink-0">{style.icon}</span>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                        <span className="font-bold tracking-tight">{activeBanner.title}:</span>
                        <span className="truncate max-w-[500px] text-slate-700 dark:text-slate-300">
                          {activeBanner.body}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {activeBanner.actionUrl && (
                        <button
                          onClick={() => handleActionClick(activeBanner.actionUrl, activeBanner.id)}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                        >
                          {activeBanner.actionLabel || 'Learn More'}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => dismissBanner(activeBanner.id)}
                        className="rounded-full p-1 text-slate-500 hover:bg-black/5 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Dismiss banner"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Interactive Popup Modal ── */}
      <AnimatePresence>
        {currentPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => dismissPopup(currentPopup.id)}
            />

            {/* Modal Card */}
            {(() => {
              const style = getSeverityStyle(currentPopup.severity);
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 16 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-[#0b0f19]"
                >
                  {/* Decorative glowing top accent header */}
                  <div className={`h-2.5 w-full bg-gradient-to-r ${style.accent}`} />

                  <div className="p-6 sm:p-7">
                    {/* Top Row: Severity Badge & Close button */}
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm">
                        <span className="flex-shrink-0">{style.icon}</span>
                        <span className="font-bold uppercase tracking-wider text-[11px]">
                          {style.label}
                        </span>
                      </div>

                      <button
                        onClick={() => dismissPopup(currentPopup.id)}
                        className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Close popup"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Content Section */}
                    <div className="mt-4">
                      <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {currentPopup.title}
                      </h3>

                      <div className="mt-3 rounded-2xl bg-slate-50 p-4 border border-slate-100 dark:bg-white/[0.03] dark:border-white/5">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                          {currentPopup.body}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
                          <span>From: {currentPopup.senderName || 'Hub Administration'}</span>
                        </span>
                        <span>{new Date(currentPopup.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                      <button
                        onClick={() => dismissPopup(currentPopup.id)}
                        className="w-full sm:w-auto rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                      >
                        I Understand
                      </button>

                      {currentPopup.actionUrl && (
                        <button
                          onClick={() => handleActionClick(currentPopup.actionUrl, currentPopup.id)}
                          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${style.accent} px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:brightness-110`}
                        >
                          <span>{currentPopup.actionLabel || 'Proceed'}</span>
                          {currentPopup.actionUrl.startsWith('http') ? (
                            <ExternalLink className="h-4 w-4" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
