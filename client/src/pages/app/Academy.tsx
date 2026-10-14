import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Clock, DoorOpen, Hourglass, Layers } from 'lucide-react';
import { Badge, Button, Card, Loading, PageHeader } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useSocketEvent } from '../../lib/socket';
import { naira } from '../../lib/format';
import type { Course, Invoice } from '../../lib/types';
import { toast } from '../../store/toast';

function CourseCard({ course }: { course: Course }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const checkout = useMutation({
    mutationFn: (plan: 'FULL' | 'HALF' | 'BALANCE') => api<Invoice>(`/courses/${course.id}/checkout`, { body: { plan } }),
    onSuccess: (invoice) => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['finance'] });
      navigate(`/app/finance?invoice=${invoice.id}`);
    },
    onError: (e) => toast.error('Checkout failed', errorMessage(e)),
  });

  const e = course.enrollment;
  const paidPct = e ? Math.min(100, Math.round((e.paidAmount / course.fullPrice) * 100)) : 0;
  const reviewing = course.openInvoice?.status === 'AWAITING_REVIEW';
  const pendingInvoice = course.openInvoice?.status === 'PENDING' ? course.openInvoice : null;

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-3 text-white"><BookOpen className="h-5 w-5" /></span>
        {course.hasAccess ? <Badge tone="green">Enrolled</Badge> : <Badge>{course.level}</Badge>}
      </div>
      <h3 className="mt-4 font-display text-lg font-bold leading-snug">{course.title}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-500">{course.description}</p>
      <div className="mt-4 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.durationWeeks} weeks</span>
        <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {course.moduleCount} modules</span>
      </div>
      <p className="mt-4 font-display text-2xl font-bold">{naira(course.fullPrice)}</p>

      {e && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-500"><span>Paid {naira(e.paidAmount)}</span><span>{paidPct}%</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" style={{ width: `${paidPct}%` }} />
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2">
        {course.hasAccess && (
          <Link to={`/app/academy/${course.id}`}><Button className="w-full"><DoorOpen className="h-4 w-4" /> Enter Classroom</Button></Link>
        )}
        {reviewing ? (
          <p className="flex items-center justify-center gap-2 rounded-full bg-blue-500/10 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-300">
            <Hourglass className="h-4 w-4" /> Payment under review
          </p>
        ) : pendingInvoice ? (
          <Button variant="outline" onClick={() => navigate(`/app/finance?invoice=${pendingInvoice.id}`)}>
            Complete payment · {naira(pendingInvoice.amount)}
          </Button>
        ) : !e ? (
          <div className="grid grid-cols-2 gap-2">
            <Button loading={checkout.isPending && checkout.variables === 'FULL'} onClick={() => checkout.mutate('FULL')}>Pay Full</Button>
            <Button variant="outline" loading={checkout.isPending && checkout.variables === 'HALF'} onClick={() => checkout.mutate('HALF')}>Pay 50%</Button>
          </div>
        ) : !e.isFullyPaid ? (
          <Button variant="outline" loading={checkout.isPending} onClick={() => checkout.mutate('BALANCE')}>
            Pay balance · {naira(course.fullPrice - e.paidAmount)}
          </Button>
        ) : null}
        {!e && !reviewing && !pendingInvoice && <p className="text-center text-xs text-slate-500">or 2 × {naira(course.halfPrice)} installments</p>}
      </div>
    </Card>
  );
}

export default function Academy() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['courses'], queryFn: () => api<Course[]>('/courses') });

  useSocketEvent('courses:changed', () => {
    qc.invalidateQueries({ queryKey: ['courses'] });
  });

  if (isLoading) return <Loading />;
  return (
    <>
      <PageHeader eyebrow="Academy" title="Tech Education" subtitle="Pay in full or in two 50% installments — your classroom unlocks as soon as the first payment is verified." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data?.map((c) => <CourseCard key={c.id} course={c} />)}
      </div>
    </>
  );
}
