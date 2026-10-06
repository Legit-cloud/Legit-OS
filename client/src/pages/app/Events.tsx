import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ExternalLink, Gamepad2, MapPin, Users } from 'lucide-react';
import { Badge, Button, Card, Empty, Loading, PageHeader } from '../../components/ui';
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
        <Card><Empty icon={<CalendarDays className="h-10 w-10" />} title="No upcoming events" hint="Check back soon." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((e) => {
            const d = e.startsAt ? new Date(e.startsAt) : null;
            const full = (e.rsvpCount ?? 0) >= e.capacity && !e.attending;
            return (
              <Card key={e.id} className="flex flex-col">
                <div className="flex items-start gap-4">
                  {d && (
                    <div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 px-3.5 py-2 text-center text-white">
                      <p className="text-[11px] font-semibold uppercase">{d.toLocaleDateString('en-NG', { timeZone: TZ, month: 'short' })}</p>
                      <p className="font-display text-2xl font-bold leading-none">{d.toLocaleDateString('en-NG', { timeZone: TZ, day: 'numeric' })}</p>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold leading-snug">{e.title}</h3>
                    {d && <p className="text-xs text-slate-500">{d.toLocaleString('en-NG', { timeZone: TZ, weekday: 'long', hour: '2-digit', minute: '2-digit' })}</p>}
                  </div>
                </div>
                <p className="mt-3 flex-1 text-sm text-slate-500">{e.description}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.location}</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {e.rsvpCount}/{e.capacity} going</span>
                </div>
                <Button
                  className="mt-4"
                  variant={e.attending ? 'success' : 'primary'}
                  disabled={full}
                  loading={rsvp.isPending && rsvp.variables === e.id}
                  onClick={() => rsvp.mutate(e.id)}
                >
                  {e.attending ? "Going ✓ (tap to cancel)" : full ? 'Fully booked' : 'RSVP'}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 mt-10 font-display text-lg font-bold">Games & sync</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {games.map((g) => (
          <Card key={g.id} className="flex items-center gap-4">
            <span className="rounded-2xl bg-violet-500/10 p-3 text-violet-600 dark:text-violet-300"><Gamepad2 className="h-6 w-6" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><h3 className="font-display font-bold">{g.title}</h3><Badge tone="violet">Web game</Badge></div>
              <p className="text-sm text-slate-500">{g.description}</p>
            </div>
            {g.externalUrl && (
              <a href={g.externalUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm">Launch <ExternalLink className="h-3.5 w-3.5" /></Button>
              </a>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
