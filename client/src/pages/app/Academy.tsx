import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Clock, DoorOpen, Hourglass, Layers } from 'lucide-react';
import { Badge, Button, Card, Loading, PageHeader } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useSocketEvent } from '../../lib/socket';
import { naira } from '../../lib/format';
import { getCourseImage } from '../../lib/courseImages';
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
    <Card variant="bento" className="p-0 overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5">
      <div>
        {/* Course Photography Header */}
        <div className="relative h-40 overflow-hidden">
          <img
            src={getCourseImage(course.slug, course.title)}
            alt={course.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 brightness-[0.85] contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0d111a] via-white/20 dark:via-[#0d111a]/30 to-transparent" />
          <span className="absolute top-3 right-3 rounded-full bg-white/90 border border-slate-200 p-2 text-blue-600 backdrop-blur-md dark:bg-blue-500/20 dark:border-blue-400/30 dark:text-blue-300 shadow-sm">
            <BookOpen className="h-4 w-4" />
          </span>
          <div className="absolute bottom-3 left-4">
            {course.hasAccess ? (
              <Badge tone="green" className="flex items-center gap-1 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Enrolled
              </Badge>
            ) : (
              <Badge tone="blue" className="shadow-sm">{course.level}</Badge>
            )}
          </div>
        </div>

        <div className="p-5 pb-2">
          <h3 className="font-display text-lg font-bold leading-snug text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {course.title}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{course.description}</p>
          <div className="mt-4 flex gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> {course.durationWeeks} weeks</span>
            <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> {course.moduleCount} modules</span>
          </div>
          <p className="mt-4 font-mono text-2xl font-extrabold text-slate-900 dark:text-white">{naira(course.fullPrice)}</p>

          {e && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Paid {naira(e.paidAmount)}</span>
                <span className="font-mono">{paidPct}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)] transition-all duration-500"
                  style={{ width: `${paidPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 pt-0">
        <div className="flex flex-col gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
        {course.hasAccess && (
          <Link to={`/app/academy/${course.id}`} className="block">
            <Button className="w-full bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-colors">
              <DoorOpen className="h-4 w-4" /> Enter Classroom
            </Button>
          </Link>
        )}
        {reviewing ? (
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 py-2.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
            <Hourglass className="h-4 w-4 animate-spin text-blue-500" /> Payment verification pending
          </p>
        ) : pendingInvoice ? (
          <Button
            variant="outline"
            className="w-full border-blue-500/40 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 dark:text-blue-400"
            onClick={() => navigate(`/app/finance?invoice=${pendingInvoice.id}`)}
          >
            Complete payment · {naira(pendingInvoice.amount)}
          </Button>
        ) : !e ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="bg-blue-600 text-white shadow-sm font-semibold hover:bg-blue-700 transition-colors"
              loading={checkout.isPending && checkout.variables === 'FULL'}
              onClick={() => checkout.mutate('FULL')}
            >
              Pay Full
            </Button>
            <Button
              variant="outline"
              loading={checkout.isPending && checkout.variables === 'HALF'}
              onClick={() => checkout.mutate('HALF')}
            >
              Pay 50%
            </Button>
          </div>
        ) : !e.isFullyPaid ? (
          <Button
            variant="outline"
            className="w-full"
            loading={checkout.isPending}
            onClick={() => checkout.mutate('BALANCE')}
          >
            Pay balance · {naira(course.fullPrice - e.paidAmount)}
          </Button>
        ) : null}
        {!e && !reviewing && !pendingInvoice && (
          <p className="text-center text-[11px] text-slate-400">or 2 installments of {naira(course.halfPrice)}</p>
        )}
        </div>
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
