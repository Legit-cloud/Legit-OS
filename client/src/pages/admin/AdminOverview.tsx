import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Armchair, Banknote, ListChecks, Users, ArrowRight, Bike } from 'lucide-react';
import { Card, Loading, PageHeader, StatCard } from '../../components/ui';
import { TelemetryConsole } from '../../components/TelemetryConsole';
import { api } from '../../lib/api';
import { naira } from '../../lib/format';
import type { TelemetryLog } from '../../lib/types';

export interface AdminOverviewData {
  activeDesks: number;
  totalMembers: number;
  pendingQueue: number;
  pendingVerifications?: number;
  pendingProofs?: number;
  openOrders?: number;
  pendingRides: number;
  totalRevenue: number;
  logs: TelemetryLog[];
}

export default function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => api<AdminOverviewData>('/admin/overview'),
    refetchInterval: 10_000,
  });
  if (isLoading || !data) return <Loading />;

  return (
    <>
      <PageHeader eyebrow="Admin Command Center" title="Hub Overview" subtitle="Live state of the hub — occupancy, members, approvals and revenue." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Armchair className="h-5 w-5" />} label="Active desks" value={data.activeDesks} hint="Checked-in sessions now" />
        <StatCard icon={<Users className="h-5 w-5" />} label="Total members" value={data.totalMembers} />
        <StatCard icon={<ListChecks className="h-5 w-5" />} label="Action queue" value={data.pendingQueue} hint="Pending proofs, orders & KYC" />
        <StatCard icon={<Banknote className="h-5 w-5" />} label="Total revenue" value={naira(data.totalRevenue)} hint="Verified payments" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
              Live Telemetry Stream
            </h2>
            <span className="font-mono text-xs text-slate-400">Hub Core System v2.4</span>
          </div>
          <TelemetryConsole initial={data.logs} />
        </div>
        <div className="space-y-3">
          <h2 className="mb-3 font-display text-lg font-bold text-slate-900">Needs attention</h2>
          {[
            { to: 'queue', icon: ListChecks, label: 'Action queue (proofs, orders, KYC)', count: data.pendingQueue, urgent: data.pendingQueue > 0 },
            { to: 'riders', icon: Bike, label: 'Rides awaiting dispatch', count: data.pendingRides, urgent: data.pendingRides > 0 },
          ].map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="bento-card group flex items-center gap-4 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-500/50 hover:shadow-md"
            >
              <span className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-600 transition group-hover:scale-110">
                <a.icon className="h-5 w-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-2xl font-extrabold text-slate-900">{a.count}</span>
                  {a.urgent && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  )}
                </span>
                <span className="block text-xs text-slate-500 truncate mt-0.5">{a.label}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-cyan-500" />
            </Link>
          ))}
          <Card variant="bento" className="border-cyan-500/20 bg-cyan-500/5 p-4 text-xs text-slate-600">
            <span className="font-semibold text-cyan-700 block mb-1">💡 Administrative Note:</span>
            Approving a payment proof automatically unlocks the course, booking, lounge order or plan it was paying for without manual database edits.
          </Card>
        </div>
      </div>
    </>
  );
}
