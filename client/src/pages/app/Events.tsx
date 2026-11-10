import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ExternalLink, Gamepad2, MapPin, Users } from 'lucide-react';
import { Badge, Button, Card, Empty, Loading, PageHeader, cn } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { TZ } from '../../lib/format';
import type { HubEvent } from '../../lib/types';
import { toast } from '../../store/toast';

export default function Events() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['events'], queryFn: () => api<HubEvent[]>('/events') });
  const rsvp = useMutation({
    mutationFn: (id: string) => api<{ attending: boolean }>(`/events/${id}/rsvp`, { method: 'POST' }),
    onSuccess: (r) => {
      toast.success(r.attending ? "You're on the list" : 'RSVP cancelled');
      qc.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (e) => toast.error('RSVP failed', errorMessage(e)),
  });

  if (isLoading) return <Loading />;
  const events = data?.filter((e) => e.kind === 'EVENT') ?? [];
  const games = data?.filter((e) => e.kind === 'GAME') ?? [];

  return (
    <>
      <PageHeader eyebrow="Events & Sync" title="What's happening" subtitle="Physical hub events and community games." />
      <h2 className="mb-3 font-display text-lg font-bold">Hub events</h2>
      {events.length === 0 ? (
        <Card variant="bento"><Empty icon={<CalendarDays className="h-10 w-10 text-cyan-500" />} title="No upcoming events" hint="Check back soon for hackathons, community meetups, and demo days." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((e) => {
            const d = e.startsAt ? new Date(e.startsAt) : null;
            const going = e.rsvpCount ?? 0;
            const full = going >= e.capacity && !e.attending;
            const pct = e.capacity > 0 ? Math.min(100, Math.round((going / e.capacity) * 100)) : 0;
            const left = Math.max(0, e.capacity - going);
            const almost = !full && left > 0 && pct >= 80;
            return (
              <Card key={e.id} variant="bento" className="flex flex-col justify-between group transition-all duration-300 [@media(hover:hover)]:hover:-translate-y-1">
                <div>
                  <div className="flex items-start gap-4">
                    {d && (
                      <div className="rounded-2xl bg-blue-600 px-3.5 py-2 text-center text-white shadow-md shadow-blue-500/25 shrink-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider">{d.toLocaleDateString('en-NG', { timeZone: TZ, month: 'short' })}</p>
                        <p className="font-display text-2xl font-bold leading-none mt-0.5">{d.toLocaleDateString('en-NG', { timeZone: TZ, day: 'numeric' })}</p>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-lg font-bold leading-snug text-slate-900 group-hover:text-blue-600 transition-colors">
                        {e.title}
                      </h3>
                      {d && <p className="mt-0.5 text-xs text-slate-500">{d.toLocaleString('en-NG', { timeZone: TZ, weekday: 'long', hour: '2-digit', minute: '2-digit' })}</p>}
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-600">{e.description}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-blue-600" /> {e.location}</span>
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-blue-600" /> {e.rsvpCount}/{e.capacity} going</span>
                  </div>
                  <div className="mt-3" aria-label={`${going} of ${e.capacity} spots taken`}>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', full ? 'bg-rose-500' : almost ? 'bg-amber-500' : 'bg-blue-600')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {(almost || full) && (
                      <p className={cn('mt-1.5 text-[11px] font-semibold', full ? 'text-rose-600' : 'text-amber-600')}>
                        {full ? 'No spots left' : `Only ${left} spot${left === 1 ? '' : 's'} left`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100">
                  <Button
                    className={cn(
                      'w-full font-semibold',
                      e.attending
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                        : full
                        ? 'opacity-50'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition-colors'
                    )}
                    disabled={full}
                    loading={rsvp.isPending && rsvp.variables === e.id}
                    onClick={() => rsvp.mutate(e.id)}
                  >
                    {e.attending ? "Going ✓ (tap to cancel)" : full ? 'Fully booked' : 'RSVP Now'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 mt-10 font-display text-lg font-bold">Games & sync</h2>
      {games.length === 0 && <Card variant="bento"><Empty icon={<Gamepad2 className="h-10 w-10 text-violet-500" />} title="No games right now" hint="Community games will show up here." /></Card>}
      <div className="grid gap-4 md:grid-cols-2">
        {games.map((g) => (
          <Card key={g.id} variant="bento" className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
            <span className="rounded-2xl bg-violet-500/10 p-3 text-violet-600 shrink-0">
              <Gamepad2 className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="font-display font-bold text-slate-900">{g.title}</h3>
                <Badge tone="violet">Web game</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{g.description}</p>
            </div>
            {g.externalUrl && (
              <a href={g.externalUrl} target="_blank" rel="noopener noreferrer" className="max-sm:w-full max-sm:[&>button]:w-full">
                <Button size="sm" className="bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm">
                  Launch <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
