import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Megaphone,
  BellRing,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  Radio,
  Send,
  Users,
  UserCheck,
  Crown,
  Sparkles,
  Eye,
  RotateCcw,
  Layout,
  Search,
  Trash2,
} from 'lucide-react';
import { Button, Card, Field, PageHeader, cn } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { tierLabel } from '../../lib/format';
import { toast } from '../../store/toast';
import type { BroadcastEntry, BroadcastSeverity, BroadcastTarget, BroadcastType, User } from '../../lib/types';

interface MemberUser extends User {
  online?: boolean;
}

const TEMPLATES = [
  {
    name: 'Hackathon Registration',
    type: 'POPUP' as BroadcastType,
    severity: 'SUCCESS' as BroadcastSeverity,
    target: 'ALL' as BroadcastTarget,
    title: '🚀 Annual Hackathon 2026 Registration Live!',
    body: 'Registrations are officially open for the L.E.G.I.T Hub 48h Innovation Sprint. Build with AI and compete for over ₦5,000,000 in grand prizes and venture credits.',
    actionLabel: 'Register Team Now',
    actionUrl: '/app/events',
  },
  {
    name: 'Scheduled Maintenance',
    type: 'BANNER' as BroadcastType,
    severity: 'WARNING' as BroadcastSeverity,
    target: 'ALL' as BroadcastTarget,
    title: '⚡ Power Grid Maintenance Notice',
    body: 'High-speed fiber and secondary generator switch-over will take place tonight between 11:00 PM and 11:30 PM. Offline workstations will remain operational.',
    actionLabel: 'View Schedule',
    actionUrl: '/app/infra',
  },
  {
    name: 'VIP Lounge Exclusive',
    type: 'COMBO' as BroadcastType,
    severity: 'INFO' as BroadcastSeverity,
    target: 'TIER' as BroadcastTarget,
    tier: 'VIP',
    title: '🍸 VIP Founders Tasting & Fireside Session',
    body: 'You are cordially invited to our private founders mixer at the Executive VIP Lounge this Friday at 6:00 PM. Complimentary artisan cocktails and networking.',
    actionLabel: 'View Lounge Menu',
    actionUrl: '/app/lounge',
  },
  {
    name: 'Urgent Hub Closure Alert',
    type: 'POPUP' as BroadcastType,
    severity: 'URGENT' as BroadcastSeverity,
    target: 'ALL' as BroadcastTarget,
    title: '⚠️ Early Hub Closure Notice',
    body: 'Due to severe weather advisories in the tech district, the physical innovation hub campus will close today at 6:00 PM. All virtual cloud workstations remain online.',
    actionLabel: 'Check Transit Rides',
    actionUrl: '/app/transit',
  },
];

export default function BroadcastCenter() {
  const qc = useQueryClient();

  // Form states
  const [type, setType] = useState<BroadcastType>('POPUP');
  const [severity, setSeverity] = useState<BroadcastSeverity>('INFO');
  const [target, setTarget] = useState<BroadcastTarget>('ALL');
  const [tier, setTier] = useState<'PAY_AS_YOU_GO' | 'PRO_MONTHLY' | 'VIP'>('VIP');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [includeAction, setIncludeAction] = useState(false);
  const [actionLabel, setActionLabel] = useState('Explore Details');
  const [actionUrl, setActionUrl] = useState('/app/events');
  const [userSearch, setUserSearch] = useState('');
  const [previewTab, setPreviewTab] = useState<'POPUP' | 'BANNER' | 'NOTIFICATION'>('POPUP');
  const [historySearch, setHistorySearch] = useState('');

  // Queries
  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api<MemberUser[]>('/admin/users'),
  });

  const historyQuery = useQuery({
    queryKey: ['admin', 'broadcast', 'history'],
    queryFn: () => api<BroadcastEntry[]>('/admin/comms/broadcast/history'),
    refetchInterval: 15_000,
  });

  const allUsers = usersQuery.data ?? [];
  const activeUsers = allUsers.filter((u) => u.status === 'ACTIVE');
  const onlineUsers = allUsers.filter((u) => u.online);

  // Filtered target count
  const recipientCount = (() => {
    if (target === 'USER') return targetUserId ? 1 : 0;
    if (target === 'TIER') return activeUsers.filter((u) => u.tier === tier).length;
    return activeUsers.length;
  })();

  const recipientOnlineCount = (() => {
    if (target === 'USER') {
      const u = allUsers.find((x) => x.id === targetUserId);
      return u?.online ? 1 : 0;
    }
    if (target === 'TIER') {
      return activeUsers.filter((u) => u.tier === tier && u.online).length;
    }
    return onlineUsers.length;
  })();

  // Filtered members for user picker
  const filteredMembers = allUsers
    .filter((u) => u.role !== 'ADMIN' || true)
    .filter(
      (u) =>
        u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()),
    )
    .slice(0, 10);

  // Send mutation
  const sendMutation = useMutation({
    mutationFn: (payload: any) => api<{ delivered: number; broadcast: BroadcastEntry }>('/admin/comms/broadcast', { body: payload }),
    onSuccess: (data) => {
      toast.success(
        'Broadcast Dispatched!',
        `Successfully sent to ${data.delivered} member${data.delivered === 1 ? '' : 's'}.`,
      );
      qc.invalidateQueries({ queryKey: ['admin', 'broadcast', 'history'] });
      // Reset form title and body
      setTitle('');
      setBody('');
      setIncludeAction(false);
    },
    onError: (err) => toast.error('Failed to dispatch broadcast', errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<{ ok: boolean; removedCount: number }>(`/admin/comms/broadcast/${id}`, { method: 'DELETE' }),
    onSuccess: (res) => {
      toast.success('Broadcast Recalled', `Broadcast removed and ${res.removedCount} member notification records deleted.`);
      qc.invalidateQueries({ queryKey: ['admin', 'broadcast', 'history'] });
    },
    onError: (err) => toast.error('Failed to recall broadcast', errorMessage(err)),
  });

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error('Validation Error', 'Title and message body are required.');
      return;
    }

    if (target === 'USER' && !targetUserId) {
      toast.error('Validation Error', 'Please select a recipient member.');
      return;
    }

    sendMutation.mutate({
      type,
      severity,
      target,
      tier: target === 'TIER' ? tier : undefined,
      targetUserId: target === 'USER' ? targetUserId : undefined,
      title: title.trim(),
      body: body.trim(),
      actionLabel: includeAction ? actionLabel.trim() : undefined,
      actionUrl: includeAction ? actionUrl.trim() : undefined,
    });
  };

  const applyTemplate = (tpl: (typeof TEMPLATES)[number]) => {
    setType(tpl.type);
    setSeverity(tpl.severity);
    setTarget(tpl.target);
    if (tpl.tier) setTier(tpl.tier as any);
    setTitle(tpl.title);
    setBody(tpl.body);
    if (tpl.actionLabel && tpl.actionUrl) {
      setIncludeAction(true);
      setActionLabel(tpl.actionLabel);
      setActionUrl(tpl.actionUrl);
    } else {
      setIncludeAction(false);
    }
    setPreviewTab(tpl.type === 'BANNER' ? 'BANNER' : 'POPUP');
    toast.info('Template Applied', `Loaded "${tpl.name}" into composer.`);
  };

  const filteredHistory = (historyQuery.data ?? []).filter((b) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.body.toLowerCase().includes(q) ||
      b.senderName?.toLowerCase().includes(q) ||
      b.target.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communications & Dispatch"
        title="Broadcasts, Notifications & Popups"
        subtitle="Push instant screen popups, top announcement banners, or in-app notifications directly to members' screens in real time."
        actions={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {onlineUsers.length} Members Online Now
            </span>
          </div>
        }
      />

      {/* Preset Quick Fill Templates */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="flex-shrink-0 text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Presets:
        </span>
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.name}
            type="button"
            onClick={() => applyTemplate(tpl)}
            className="flex-shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:border-cyan-500 hover:text-cyan-600"
          >
            {tpl.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* ── Left Column: Broadcast Composer ── */}
        <div className="lg:col-span-7 space-y-6">
          <Card variant="bento" className="p-6">
            <form onSubmit={handleSend} className="space-y-6">
              {/* Delivery Format / Type */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
                  1. Choose Delivery Format
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    {
                      id: 'POPUP',
                      label: 'Screen Popup',
                      icon: Layout,
                      desc: 'Modal popover on screen',
                      badge: 'High Impact',
                    },
                    {
                      id: 'NOTIFICATION',
                      label: 'Notification',
                      icon: BellRing,
                      desc: 'Toast + Bell feed item',
                      badge: 'Routine',
                    },
                    {
                      id: 'BANNER',
                      label: 'Top Banner',
                      icon: Radio,
                      desc: 'Pinned alert marquee',
                      badge: 'Sticky Bar',
                    },
                    {
                      id: 'COMBO',
                      label: 'Popup + Notice',
                      icon: Sparkles,
                      desc: 'Popup & saved to bell',
                      badge: 'Complete',
                    },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => {
                        setType(fmt.id as BroadcastType);
                        if (fmt.id === 'BANNER') setPreviewTab('BANNER');
                        else if (fmt.id === 'NOTIFICATION') setPreviewTab('NOTIFICATION');
                        else setPreviewTab('POPUP');
                      }}
                      className={cn(
                        'flex flex-col items-start justify-between rounded-2xl border p-3.5 text-left transition relative overflow-hidden',
                        type === fmt.id
                          ? 'border-cyan-500 bg-cyan-500/10 shadow-sm text-cyan-900 ring-2 ring-cyan-500/30'
                          : 'border-slate-200 bg-white hover:border-slate-300',
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <fmt.icon className={cn('h-5 w-5', type === fmt.id ? 'text-cyan-600' : 'text-slate-500')} />
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {fmt.badge}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-tight">{fmt.label}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{fmt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Urgency / Severity */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
                  2. Urgency & Tone (Severity)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'INFO', label: 'Info & News', icon: Info, color: 'text-cyan-500', active: 'border-cyan-500 bg-cyan-500/10 ring-cyan-500/30' },
                    { id: 'SUCCESS', label: 'Success & Win', icon: CheckCircle2, color: 'text-emerald-500', active: 'border-emerald-500 bg-emerald-500/10 ring-emerald-500/30' },
                    { id: 'WARNING', label: 'Warning / Notice', icon: AlertCircle, color: 'text-amber-500', active: 'border-amber-500 bg-amber-500/10 ring-amber-500/30' },
                    { id: 'URGENT', label: 'Urgent / Critical', icon: AlertTriangle, color: 'text-rose-500', active: 'border-rose-500 bg-rose-500/10 ring-rose-500/30' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSeverity(s.id as BroadcastSeverity)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-2xl border p-3 text-left transition',
                        severity === s.id
                          ? cn('border-2 font-bold ring-2', s.active)
                          : 'border-slate-200 bg-white hover:border-slate-300',
                      )}
                    >
                      <s.icon className={cn('h-4 w-4 flex-shrink-0', s.color)} />
                      <span className="text-xs">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
                  3. Target Audience
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'ALL', label: 'All Active Members', icon: Users, desc: `${activeUsers.length} members` },
                    { id: 'TIER', label: 'By Member Tier', icon: Crown, desc: 'VIP, PAYG' },
                    { id: 'USER', label: 'Specific Member', icon: UserCheck, desc: 'Single recipient' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTarget(t.id as BroadcastTarget)}
                      className={cn(
                        'flex flex-col items-start rounded-2xl border p-3 text-left transition',
                        target === t.id
                          ? 'border-cyan-500 bg-cyan-500/10 font-bold ring-2 ring-cyan-500/30'
                          : 'border-slate-200 bg-white hover:border-slate-300',
                      )}
                    >
                      <t.icon className={cn('h-4 w-4 mb-1.5', target === t.id ? 'text-cyan-600' : 'text-slate-500')} />
                      <span className="text-xs font-semibold">{t.label}</span>
                      <span className="text-[11px] text-slate-500">{t.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Sub-selectors for TIER or USER */}
                {target === 'TIER' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5"
                  >
                    <p className="text-xs font-semibold text-slate-600 mb-2">Select Target Tier:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'VIP', label: 'VIP Members', count: activeUsers.filter((u) => u.tier === 'VIP').length },
                        { id: 'PAY_AS_YOU_GO', label: 'Pay As You Go (Standard)', count: activeUsers.filter((u) => u.tier === 'PAY_AS_YOU_GO').length },
                      ].map((tr) => (
                        <button
                          key={tr.id}
                          type="button"
                          onClick={() => setTier(tr.id as any)}
                          className={cn(
                            'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                            tier === tr.id
                              ? 'bg-cyan-500 text-white shadow-sm'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100',
                          )}
                        >
                          {tr.label} ({tr.count})
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {target === 'USER' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 border border-slate-200">
                      <Search className="h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search member by name or email..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                      />
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
                      {filteredMembers.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setTargetUserId(m.id)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition',
                            targetUserId === m.id
                              ? 'bg-cyan-500 text-white font-bold'
                              : 'hover:bg-slate-200/60 text-slate-700',
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn('h-2 w-2 rounded-full', m.online ? 'bg-emerald-500' : 'bg-slate-300')} />
                            <span className="truncate font-semibold">{m.fullName}</span>
                            <span className="text-[11px] opacity-75">({m.email})</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-mono opacity-80">
                            {tierLabel(m.tier)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Message Details */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <Field label="4. Broadcast Title">
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. 🚀 Annual Hackathon 2026 Registration Live!"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="field font-medium text-sm"
                  />
                </Field>

                <Field label="5. Message Content (Body)">
                  <textarea
                    required
                    rows={4}
                    maxLength={1000}
                    placeholder="Provide full announcement details. Line breaks are preserved in popups and notifications..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="field text-sm leading-relaxed"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>Supports multi-line announcements & emojis</span>
                    <span>{body.length} / 1000 characters</span>
                  </div>
                </Field>
              </div>

              {/* Call to Action (Optional CTA) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Interactive Call-to-Action (CTA)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Add a direct action button so users can jump straight to an event, academy course, or lounge
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="includeAction"
                    checked={includeAction}
                    onChange={(e) => setIncludeAction(e.target.checked)}
                    className="h-4 w-4 rounded text-cyan-600 focus:ring-cyan-500"
                  />
                </div>

                {includeAction && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2"
                  >
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">Button Label</label>
                      <input
                        type="text"
                        placeholder="e.g. Register Team Now"
                        value={actionLabel}
                        onChange={(e) => setActionLabel(e.target.value)}
                        className="field text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">Destination URL or Route</label>
                      <input
                        type="text"
                        placeholder="e.g. /app/events or https://..."
                        value={actionUrl}
                        onChange={(e) => setActionUrl(e.target.value)}
                        className="field text-xs"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Summary and Dispatch Button */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-cyan-500" />
                    Delivering to <strong>{recipientCount}</strong> member{recipientCount === 1 ? '' : 's'}
                    {recipientOnlineCount > 0 && (
                      <span className="text-emerald-600 font-semibold">
                        ({recipientOnlineCount} online now)
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                    Format: {type} · {severity}
                  </span>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  loading={sendMutation.isPending}
                  disabled={recipientCount === 0 || !title.trim() || !body.trim()}
                  className="w-full text-base py-3.5 shadow-xl shadow-cyan-500/20"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Dispatch {type === 'POPUP' ? 'Screen Popup' : type === 'BANNER' ? 'Top Banner' : 'Notification'} Now
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* ── Right Column: Live Device Simulator / Preview ── */}
        <div className="lg:col-span-5 space-y-6">
          <Card variant="bento" className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-cyan-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Live Member-Side Preview
                </h3>
              </div>

              {/* Preview mode switcher */}
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewTab('POPUP')}
                  className={cn(
                    'rounded-lg px-2.5 py-1 font-semibold transition',
                    previewTab === 'POPUP' ? 'bg-white shadow-sm text-cyan-600' : 'text-slate-500',
                  )}
                >
                  Popup
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('BANNER')}
                  className={cn(
                    'rounded-lg px-2.5 py-1 font-semibold transition',
                    previewTab === 'BANNER' ? 'bg-white shadow-sm text-cyan-600' : 'text-slate-500',
                  )}
                >
                  Banner
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('NOTIFICATION')}
                  className={cn(
                    'rounded-lg px-2.5 py-1 font-semibold transition',
                    previewTab === 'NOTIFICATION' ? 'bg-white shadow-sm text-cyan-600' : 'text-slate-500',
                  )}
                >
                  Notice
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Real-time rendering of what your members see when this broadcast triggers.
            </p>

            {/* Simulated Desktop Container */}
            <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-4 min-h-[360px] flex flex-col justify-center relative overflow-hidden">
              {/* Simulated Header Bar */}
              <div className="absolute top-0 left-0 right-0 border-b border-slate-200 bg-white/80 px-3 py-2 flex items-center justify-between backdrop-blur-sm z-10">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  <span className="text-[10px] font-mono text-slate-400 ml-2">L.E.G.I.T Innovation Hub · Member Portal</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-cyan-600">Live Simulation</span>
                </div>
              </div>

              {/* Top Banner Mode Simulation */}
              {previewTab === 'BANNER' && (
                <div className="w-full mt-8">
                  <div
                    className={cn(
                      'rounded-xl border px-3.5 py-2.5 text-xs font-medium shadow-sm transition',
                      severity === 'URGENT' && 'bg-rose-50 border-rose-200 text-rose-950',
                      severity === 'WARNING' && 'bg-amber-50 border-amber-200 text-amber-950',
                      severity === 'SUCCESS' && 'bg-emerald-50 border-emerald-200 text-emerald-950',
                      severity === 'INFO' && 'bg-cyan-50 border-cyan-200 text-cyan-950',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {severity === 'URGENT' && <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />}
                        {severity === 'WARNING' && <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />}
                        {severity === 'SUCCESS' && <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />}
                        {severity === 'INFO' && <BellRing className="h-4 w-4 text-cyan-600 flex-shrink-0" />}
                        <span className="font-bold truncate">{title || 'Announcement Title'}</span>
                      </div>
                      {includeAction && (
                        <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold text-white flex-shrink-0">
                          {actionLabel || 'Learn More'}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] opacity-90 line-clamp-2">{body || 'Announcement body content will appear here...'}</p>
                  </div>
                </div>
              )}

              {/* Notification Toast Mode Simulation */}
              {previewTab === 'NOTIFICATION' && (
                <div className="w-full max-w-sm mx-auto mt-8 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                    <div className="flex items-start gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-500/10 text-cyan-600">
                        <BellRing className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold leading-tight text-slate-900">
                          {title || 'New In-App Notification'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                          {body || 'Your message will be stored in the member notification bell and pop as a toast...'}
                        </p>
                        <span className="mt-2 block text-[10px] text-slate-400">Just now · Admin Dispatch</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Popup Modal Mode Simulation */}
              {previewTab === 'POPUP' && (
                <div className="w-full max-w-sm mx-auto mt-8">
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
                    <div
                      className={cn(
                        'h-2 w-full',
                        severity === 'URGENT' && 'bg-gradient-to-r from-rose-500 to-red-600',
                        severity === 'WARNING' && 'bg-gradient-to-r from-amber-500 to-orange-500',
                        severity === 'SUCCESS' && 'bg-gradient-to-r from-emerald-500 to-teal-600',
                        severity === 'INFO' && 'bg-blue-600',
                      )}
                    />
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          {severity} Announcement
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">POPUP</span>
                      </div>

                      <h4 className="font-display font-bold text-base text-slate-900 leading-snug">
                        {title || 'Sample Modal Popup Title'}
                      </h4>

                      <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs text-slate-600 max-h-28 overflow-y-auto leading-relaxed">
                        {body || 'This screen-interrupting modal appears right over whatever page the member is browsing, demanding their immediate attention.'}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button type="button" className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500">
                          Dismiss
                        </button>
                        {includeAction && (
                          <button
                            type="button"
                            className={cn(
                              'rounded-lg px-3 py-1 text-xs font-semibold text-white shadow-md',
                              severity === 'URGENT' && 'bg-rose-600',
                              severity === 'WARNING' && 'bg-amber-600',
                              severity === 'SUCCESS' && 'bg-emerald-600',
                              severity === 'INFO' && 'bg-cyan-600',
                            )}
                          >
                            {actionLabel || 'Proceed'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Sent Broadcasts History ── */}
      <Card variant="bento" className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h3 className="font-display text-lg font-bold">Broadcast Dispatch History</h3>
            <p className="text-xs text-slate-500">Log of all previously dispatched broadcast announcements and alerts</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none w-36 sm:w-48"
              />
            </div>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ['admin', 'broadcast', 'history'] })}
              className="rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-100"
              title="Refresh history"
            >
              <RotateCcw className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
            <Megaphone className="mx-auto h-8 w-8 text-slate-400 mb-2 opacity-50" />
            <p className="text-sm font-semibold">No Broadcasts Recorded</p>
            <p className="text-xs text-slate-400 mt-1">Compose your first announcement above to reach members.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 font-semibold uppercase tracking-wider">Date & Time</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider">Type</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider">Severity</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider">Target</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider">Title & Message</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider">Dispatched By</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider text-right">Recipients</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full font-bold text-[10px] uppercase',
                        item.type === 'POPUP' && 'bg-purple-500/10 text-purple-600',
                        item.type === 'BANNER' && 'bg-amber-500/10 text-amber-600',
                        item.type === 'NOTIFICATION' && 'bg-cyan-500/10 text-cyan-600',
                        item.type === 'COMBO' && 'bg-blue-500/10 text-blue-600',
                      )}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full font-bold text-[10px] uppercase',
                        item.severity === 'URGENT' && 'bg-rose-500/10 text-rose-600',
                        item.severity === 'WARNING' && 'bg-amber-500/10 text-amber-600',
                        item.severity === 'SUCCESS' && 'bg-emerald-500/10 text-emerald-600',
                        item.severity === 'INFO' && 'bg-cyan-500/10 text-cyan-600',
                      )}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="py-3 whitespace-nowrap font-medium text-slate-700">
                      {item.target === 'ALL' && 'All Members'}
                      {item.target === 'TIER' && `Tier: ${item.tier}`}
                      {item.target === 'USER' && (item.targetUserName ? `User: ${item.targetUserName}` : 'Specific User')}
                    </td>
                    <td className="py-3 min-w-[240px] max-w-md">
                      <p className="font-bold text-slate-900 truncate">{item.title}</p>
                      <p className="text-slate-500 truncate text-[11px] mt-0.5">{item.body}</p>
                    </td>
                    <td className="py-3 whitespace-nowrap text-slate-500">
                      {item.senderName || 'Admin'}
                    </td>
                    <td className="py-3 whitespace-nowrap text-right font-mono font-bold text-cyan-600">
                      {item.deliveredCount}
                    </td>
                    <td className="py-3 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Recall & delete broadcast "${item.title}"?\n\nThis will remove it from all members' notification history and close any active popups/banners.`)) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Recall & delete broadcast"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
