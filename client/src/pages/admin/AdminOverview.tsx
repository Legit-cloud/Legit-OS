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
  pendingRides: number;
  totalRevenue: number;
  logs: TelemetryLog[];
}

export default function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => api<AdminOverviewData>('/admin/overview'),
    refetchInterval: 30_000,
  });
  if (isLoading || !data) return <Loading />;

  return (
    <>
      <PageHeader eyebrow="Admin Command Center" title="Hub Overview" subtitle="Live state of the hub — occupancy, members, approvals and revenue." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Armchair className="h-5 w-5" />} label="Active desks" value={data.activeDesks} hint="Checked-in sessions now" />
        <StatCard icon={<Users className="h-5 w-5" />} label="Total members" value={data.totalMembers} />
        <StatCard icon={<ListChecks className="h-5 w-5" />} label="Action queue" value={data.pendingQueue} hint="Proofs + open lounge orders" />
        <StatCard icon={<Banknote className="h-5 w-5" />} label="Total revenue" value={naira(data.totalRevenue)} hint="Verified payments" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="mb-3 font-display text-lg font-bold">Recent telemetry</h2>
          <TelemetryConsole initial={data.logs} />
        </div>
        <div className="space-y-3">
          <h2 className="mb-3 font-display text-lg font-bold">Needs attention</h2>
          {[
            { to: '/admin/queue', icon: ListChecks, label: 'Payment proofs & orders', count: data.pendingQueue },
            { to: '/admin/riders', icon: Bike, label: 'Rides awaiting dispatch', count: data.pendingRides },
          ].map((a) => (
            <Link key={a.to} to={a.to} className="glass group flex items-center gap-4 p-5 transition hover:border-cyan-500/40">
              <span className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-600 dark:text-cyan-400"><a.icon className="h-5 w-5" /></span>
              <span className="flex-1"><span className="block font-display text-2xl font-bold">{a.count}</span><span className="text-sm text-slate-500">{a.label}</span></span>
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
            </Link>
          ))}
          <Card className="text-sm text-slate-500">Approving a payment proof automatically unlocks the course, booking, lounge order or plan it was paying for.</Card>
        </div>
      </div>
    </>
  );
}
