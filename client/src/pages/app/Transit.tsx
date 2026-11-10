import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, Car, CheckCircle2, Circle, Clock, MapPin, Navigation, Phone, Radio, Sparkles } from 'lucide-react';
import { Badge, Button, Card, Field, Loading, PageHeader, StatusBadge, cn } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDateTime, naira } from '../../lib/format';
import { useSocketEvent } from '../../lib/socket';
import type { TransitRequest, Vehicle } from '../../lib/types';
import { toast } from '../../store/toast';

// Set to true to display the Coming Soon status on the user end while preserving all underlying code.
const TRANSIT_COMING_SOON = true;

const VEHICLES: { type: Vehicle; icon: typeof Bike; blurb: string }[] = [
  { type: 'Bike', icon: Bike, blurb: 'Fastest · 1 seat' },
  { type: 'Keke', icon: Navigation, blurb: 'Affordable · 3 seats' },
  { type: 'Cab', icon: Car, blurb: 'Comfort · 4 seats' },
];

const STEPS = ['REQUESTED', 'ASSIGNED', 'EN_ROUTE', 'COMPLETED'] as const;
const STEP_LABEL = { REQUESTED: 'Finding a rider', ASSIGNED: 'Rider assigned', EN_ROUTE: 'On the way', COMPLETED: 'Arrived' };

// OpenStreetMap embed centred on Ibadan, Nigeria.
const MAP_SRC = 'https://www.openstreetmap.org/export/embed.html?bbox=3.83%2C7.31%2C4.03%2C7.46&layer=mapnik&marker=7.3775%2C3.947';

export default function Transit() {
  const qc = useQueryClient();
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [vehicle, setVehicle] = useState<Vehicle>('Keke');
  const { data, isLoading } = useQuery({
    queryKey: ['transit'],
    queryFn: () => api<{ fares: Record<Vehicle, number>; rides: TransitRequest[] }>('/transit'),
  });
  useSocketEvent('transit:update', () => qc.invalidateQueries({ queryKey: ['transit'] }));

  const request = useMutation({
    mutationFn: () => api<TransitRequest>('/transit', { body: { pickupLocation: pickup, dropoffLocation: dropoff || undefined, vehicleType: vehicle } }),
    onSuccess: () => {
      toast.success('Ride requested', 'Dispatch is assigning the nearest rider.');
      setPickup('');
      setDropoff('');
      qc.invalidateQueries({ queryKey: ['transit'] });
    },
    onError: (e) => toast.error('Request failed', errorMessage(e)),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api(`/transit/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transit'] }),
    onError: (e) => toast.error('Could not cancel', errorMessage(e)),
  });

  if (isLoading) return <Loading />;
  const live = data?.rides.find((r) => ['REQUESTED', 'ASSIGNED', 'EN_ROUTE'].includes(r.status));
  const history = data?.rides.filter((r) => r !== live) ?? [];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (TRANSIT_COMING_SOON) {
      toast.info('Transit Dispatch Coming Soon', 'On-demand dispatch is currently in rider onboarding & pilot testing across Ibadan.');
      return;
    }
    request.mutate();
  };

  return (
    <>
      <PageHeader
        eyebrow="Transit Hub"
        title="Get to the hub"
        subtitle="Request a Bike, Keke or Cab anywhere in Ibadan. (Service launching soon)"
      />

      {TRANSIT_COMING_SOON ? (
        <Card variant="bento" className="relative overflow-hidden p-8 sm:p-12 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-blue-500/5 pointer-events-none" />
          <div className="relative mx-auto max-w-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-500/20 to-blue-600/20 text-blue-600 shadow-inner">
              <Bike className="h-8 w-8" />
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-700">
              <Clock className="h-3.5 w-3.5" />
              <span>Coming Soon · Pilot Launching</span>
            </div>

            <h2 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl text-slate-900">
              On-Demand Transit to the Hub
            </h2>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-600">
              We are connecting innovators directly to L.E.G.I.T Innovation Hub. Our dedicated transit network will let you hail verified Bikes, Kekes, and Cabs anywhere across Ibadan with priority hub drop-offs.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3 text-left">
              <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                  <Bike className="h-5 w-5" />
                </div>
                <p className="mt-3 font-semibold text-slate-900 text-sm">Express Bike</p>
                <p className="mt-1 text-xs text-slate-500 leading-normal">Fastest 1-seater dispatch to beat peak-hour traffic across Ibadan.</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                  <Navigation className="h-5 w-5" />
                </div>
                <p className="mt-3 font-semibold text-slate-900 text-sm">Keke Commuter</p>
                <p className="mt-1 text-xs text-slate-500 leading-normal">Affordable 3-passenger local trips connecting nearby transit nodes.</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Car className="h-5 w-5" />
                </div>
                <p className="mt-3 font-semibold text-slate-900 text-sm">Executive Cab</p>
                <p className="mt-1 text-xs text-slate-500 leading-normal">Air-conditioned comfort for meetings, presentations, and team rides.</p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500 flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>Rider onboarding and live geo-tracking are currently undergoing pilot testing. This feature will be unlocked automatically soon.</span>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4">
            {live ? (
              <Card variant="bento">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 font-display font-bold"><Radio className="h-4 w-4 animate-pulse text-cyan-500" /> Live dispatch</p>
                  <StatusBadge status={live.status} />
                </div>
                <p className="mt-3 text-sm text-slate-500">{live.vehicleType} · {live.pickupLocation} → {live.dropoffLocation}</p>
                <ol className="mt-5 space-y-3">
                  {STEPS.map((s, i) => {
                    const done = STEPS.indexOf(live.status as (typeof STEPS)[number]) >= i;
                    return (
                      <li key={s} className={cn('flex items-center gap-3 text-sm', done ? 'font-semibold' : 'text-slate-400')}>
                        {done ? <CheckCircle2 className="h-5 w-5 text-cyan-500" /> : <Circle className="h-5 w-5" />} {STEP_LABEL[s]}
                      </li>
                    );
                  })}
                </ol>
                {live.rider && (
                  <div className="mt-5 rounded-2xl bg-cyan-500/10 p-4">
                    <p className="font-semibold">{live.rider.name}</p>
                    <p className="text-sm text-slate-500">{live.rider.vehicleType} · {live.rider.plate}</p>
                    <a href={`tel:${live.rider.phone}`} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-600"><Phone className="h-4 w-4" /> {live.rider.phone}</a>
                  </div>
                )}
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Estimated fare <strong className="text-slate-900">{naira(live.fareEstimate)}</strong></span>
                  {['REQUESTED', 'ASSIGNED'].includes(live.status) && (
                    <Button size="sm" variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate(live.id)}>Cancel ride</Button>
                  )}
                </div>
              </Card>
            ) : (
              <Card>
                <form onSubmit={submit} className="space-y-4">
                  <Field label="Pickup location">
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-500" />
                      <input className="field pl-10" required minLength={3} value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="e.g. Bodija Market, Ibadan" />
                    </div>
                  </Field>
                  <Field label="Destination" hint="Leave empty to ride to the hub.">
                    <input className="field" value={dropoff} onChange={(e) => setDropoff(e.target.value)} placeholder="L.E.G.I.T Innovation Hub" />
                  </Field>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Vehicle</p>
                    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Vehicle type">
                      {VEHICLES.map((v) => (
                        <button
                          type="button"
                          key={v.type}
                          role="radio"
                          aria-checked={vehicle === v.type}
                          onClick={() => setVehicle(v.type)}
                          className={cn(
                            'rounded-2xl border p-3 text-center transition',
                            vehicle === v.type ? 'border-cyan-500 bg-cyan-500/10 ring-4 ring-cyan-500/10' : 'border-slate-200 hover:border-cyan-400',
                          )}
                        >
                          <v.icon className="mx-auto h-6 w-6 text-cyan-600" />
                          <p className="mt-1 font-semibold">{v.type}</p>
                          <p className="text-[11px] text-slate-500">{naira(data?.fares[v.type] ?? 0)}</p>
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{VEHICLES.find((v) => v.type === vehicle)?.blurb}</p>
                  </div>
                  <Button type="submit" className="w-full" loading={request.isPending}>Request {vehicle}</Button>
                </form>
              </Card>
            )}

            <Card>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Ride history</p>
              {history.length === 0 ? (
                <p className="text-sm text-slate-500">No past rides yet.</p>
              ) : (
                <ul className="space-y-3">
                  {history.slice(0, 6).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0"><span className="block truncate font-medium">{r.pickupLocation}</span><span className="text-xs text-slate-500">{r.vehicleType} · {formatDateTime(r.createdAt)}</span></span>
                      <StatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="relative min-h-[420px] overflow-hidden p-0 sm:p-0">
            <iframe title="Map of Ibadan, Nigeria" src={MAP_SRC} className="absolute inset-0 h-full w-full border-0" loading="lazy" />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <Badge tone="cyan" className="bg-white/90 shadow">Ibadan, Nigeria</Badge>
              <Badge tone={live ? 'violet' : 'green'} className="bg-white/90 shadow">
                {live ? STEP_LABEL[live.status as keyof typeof STEP_LABEL] : 'Dispatch ready'}
              </Badge>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
