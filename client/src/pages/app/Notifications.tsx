import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellRing,
  Megaphone,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Check,
  CheckCheck,
  Search,
  ExternalLink,
  ArrowRight,
  Maximize2,
  Sparkles,
  Inbox,
  Volume2,
  VolumeX,
  Play,
} from 'lucide-react';
import { Button, Card, PageHeader, cn } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { toast } from '../../store/toast';
import { triggerPopup } from '../../components/BroadcastReceiver';
import type { BroadcastEntry, Notification } from '../../lib/types';
import {
  isSoundEnabled,
  toggleSound,
  playChime,
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
  showDesktopNotification,
} from '../../lib/soundAndNotification';

export default function Notifications() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'broadcasts'>('all');
  const [search, setSearch] = useState('');
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [desktopPerm, setDesktopPerm] = useState(() => getDesktopNotificationPermission());

  // Notifications query
  const notifQuery = useQuery({
    queryKey: ['notifications', 'full'],
    queryFn: () => api<{ items: Notification[]; unread: number }>('/notifications?limit=150'),
    refetchInterval: 15_000,
  });

  // User's targeted broadcasts query
  const broadcastsQuery = useQuery({
    queryKey: ['comms', 'user-broadcasts'],
    queryFn: () => api<BroadcastEntry[]>('/comms/broadcasts'),
    refetchInterval: 15_000,
  });

  // Mark all read mutation
  const markAllRead = useMutation({
    mutationFn: () => api('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All marked as read');
    },
    onError: (err) => toast.error('Failed to mark read', errorMessage(err)),
  });

  // Mark single notification read
  const markSingleRead = useMutation({
    mutationFn: (id: string) => api(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = notifQuery.data?.items ?? [];
  const broadcasts = broadcastsQuery.data ?? [];
  const unreadCount = notifQuery.data?.unread ?? 0;

  // Match notification with broadcast entry if applicable
  const getBroadcastForNotification = (n: Notification): BroadcastEntry | undefined => {
    return broadcasts.find(
      (b) =>
        b.title.trim().toLowerCase() === n.title.trim().toLowerCase() ||
        (b.body && n.body && b.body.slice(0, 30) === n.body.slice(0, 30)),
    );
  };

  // Filter items
  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread' && n.read) return false;
    const isBroadcast = Boolean(getBroadcastForNotification(n));
    if (filter === 'broadcasts' && !isBroadcast) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
    }
    return true;
  });

  const handleOpenPopup = (b: BroadcastEntry) => {
    triggerPopup(b);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account & Communications"
        title="Notifications & Announcements"
        subtitle="Stay updated with official hub announcements, interactive popups, and important updates sent directly from administration."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const next = toggleSound();
                setSoundOn(next);
                if (next) playChime('chime');
                toast.info(next ? 'Audio chime enabled' : 'Audio chime muted');
              }}
              title={soundOn ? 'Mute audio chime' : 'Enable audio chime'}
            >
              {soundOn ? <Volume2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
              {soundOn ? 'Chime on' : 'Chime muted'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => playChime('chime')}
              title="Test audio chime"
            >
              <Play className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Test Chime
            </Button>
            {desktopPerm !== 'granted' && (
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  const granted = await requestDesktopNotificationPermission();
                  setDesktopPerm(getDesktopNotificationPermission());
                  if (granted) {
                    showDesktopNotification('L.E.G.I.T Innovation Hub', 'Desktop notifications enabled!');
                    toast.success('Desktop notifications enabled');
                  } else {
                    toast.error('Permission denied', 'Please check browser settings to enable desktop alerts.');
                  }
                }}
              >
                <BellRing className="h-4 w-4" /> Enable Desktop Alerts
              </Button>
            )}
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead.mutate()}
                loading={markAllRead.isPending}
              >
                <CheckCheck className="h-4 w-4" /> Mark all read ({unreadCount})
              </Button>
            )}
          </div>
        }
      />

      {/* Prominent Unread Indicator Banner */}
      {unreadCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-3xl border border-blue-500/30 bg-blue-50/60 dark:bg-blue-950/20 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-blue-600 shadow-md shadow-blue-500/50" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                You have {unreadCount} unread notification{unreadCount === 1 ? '' : 's'} & announcement{unreadCount === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                New updates and administrative notices are waiting for your review.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilter('unread')}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/25 transition-colors"
          >
            <span>Filter unread ({unreadCount})</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Top Controls: Search & Tabs */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Tabs */}
          <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-white/5 text-xs font-semibold overflow-x-auto scrollbar-none">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'rounded-xl px-4 py-2 transition whitespace-nowrap',
                filter === 'all'
                  ? 'bg-white shadow-sm dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
              )}
            >
              All Notifications ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={cn(
                'rounded-xl px-4 py-2 transition flex items-center gap-1.5 whitespace-nowrap',
                filter === 'unread'
                  ? 'bg-white shadow-sm dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
              )}
            >
              Unread
              {unreadCount > 0 && (
                <span className="grid h-4 min-w-4 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('broadcasts')}
              className={cn(
                'rounded-xl px-4 py-2 transition flex items-center gap-1.5 whitespace-nowrap',
                filter === 'broadcasts'
                  ? 'bg-white shadow-sm dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
              )}
            >
              <Megaphone className="h-3.5 w-3.5" />
              Official Broadcasts ({broadcasts.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-900 w-full sm:w-64">
            <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none dark:text-white"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600">
                ×
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-3xl bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400">
            <Inbox className="h-7 w-7" />
          </div>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            {filter === 'unread'
              ? "You're all caught up!"
              : search
              ? 'No matching notifications found'
              : 'No notifications in your inbox'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            {filter === 'unread'
              ? 'There are no unread notifications right now. Any new messages from administration will appear here.'
              : search
              ? 'Try adjusting your search keywords to find previous announcements.'
              : 'When administrators broadcast popups, alerts, or system notifications, they will be archived here for you.'}
          </p>
          {filter !== 'all' && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setFilter('all')}>
              View all notifications
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredNotifications.map((n) => {
              const broadcast = getBroadcastForNotification(n);
              const severity = broadcast?.severity || 'INFO';

              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    'group relative rounded-3xl border p-5 transition shadow-sm',
                    n.read
                      ? 'border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/60'
                      : 'border-blue-500/40 bg-blue-50/50 ring-1 ring-blue-500/20 dark:border-blue-500/30 dark:bg-blue-950/20',
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Severity / Format Icon */}
                    <div
                      className={cn(
                        'grid h-10 w-10 flex-shrink-0 place-items-center rounded-2xl shadow-sm',
                        severity === 'URGENT' && 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
                        severity === 'WARNING' && 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
                        severity === 'SUCCESS' && 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
                        severity === 'INFO' && !broadcast && 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
                        severity === 'INFO' && broadcast && 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
                      )}
                    >
                      {severity === 'URGENT' && <AlertTriangle className="h-5 w-5" />}
                      {severity === 'WARNING' && <AlertCircle className="h-5 w-5" />}
                      {severity === 'SUCCESS' && <CheckCircle2 className="h-5 w-5" />}
                      {severity === 'INFO' && broadcast && <Megaphone className="h-5 w-5" />}
                      {severity === 'INFO' && !broadcast && <BellRing className="h-5 w-5" />}
                    </div>

                    {/* Notification Body Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-display font-bold text-base text-slate-900 dark:text-white leading-snug">
                          {n.title}
                        </h4>

                        {!n.read && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm shadow-blue-500/30">
                            New
                          </span>
                        )}

                        {broadcast && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                            <Sparkles className="h-3 w-3" /> Broadcast
                          </span>
                        )}

                        {broadcast?.severity && broadcast.severity !== 'INFO' && (
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                              broadcast.severity === 'URGENT' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                              broadcast.severity === 'WARNING' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                              broadcast.severity === 'SUCCESS' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                            )}
                          >
                            {broadcast.severity}
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {n.body}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                        <div className="flex items-center gap-3">
                          <span>{timeAgo(n.createdAt)}</span>
                          <span>·</span>
                          <span>{new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {broadcast?.senderName && (
                            <>
                              <span>·</span>
                              <span className="text-blue-600 dark:text-blue-400 font-medium">By {broadcast.senderName}</span>
                            </>
                          )}
                        </div>

                        {/* Actions for this notification */}
                        <div className="flex items-center gap-2">
                          {/* If it was a popup broadcast, allow viewing modal popup again! */}
                          {broadcast && (broadcast.type === 'POPUP' || broadcast.type === 'COMBO') && (
                            <button
                              onClick={() => handleOpenPopup(broadcast)}
                              className="inline-flex items-center gap-1 rounded-xl bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-600 hover:bg-purple-500/20 dark:text-purple-300"
                              title="Re-open interactive screen popup modal"
                            >
                              <Maximize2 className="h-3.5 w-3.5" /> Reopen Popup
                            </button>
                          )}

                          {/* Call To Action button if configured */}
                          {broadcast?.actionUrl && (
                            <a
                              href={broadcast.actionUrl}
                              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors"
                            >
                              <span>{broadcast.actionLabel || 'View Link'}</span>
                              {broadcast.actionUrl.startsWith('http') ? (
                                <ExternalLink className="h-3 w-3" />
                              ) : (
                                <ArrowRight className="h-3 w-3" />
                              )}
                            </a>
                          )}

                          {/* Mark Read Toggle */}
                          {!n.read && (
                            <button
                              onClick={() => markSingleRead.mutate(n.id)}
                              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
