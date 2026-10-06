import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Circle, Lock, PlayCircle } from 'lucide-react';
import { Badge, Button, Card, Empty, Loading, PageHeader, cn } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { naira } from '../../lib/format';

interface ClassroomData {
  course: { id: string; title: string; description: string; fullPrice: number; durationWeeks: number };
  modules: { week: number; title: string; lessons: number }[];
  enrollment: { paidAmount: number; isFullyPaid: boolean };
}

export default function Classroom() {
  const { id } = useParams();
  const [current, setCurrent] = useState(0);
  const { data, isLoading, error } = useQuery({
    queryKey: ['classroom', id],
    queryFn: () => api<ClassroomData>(`/courses/${id}/classroom`),
    retry: false,
  });

  if (isLoading) return <Loading label="Entering classroom…" />;
  if (error || !data) {
    return (
      <Card>
        <Empty
          icon={<Lock className="h-10 w-10" />}
          title={error instanceof ApiError && error.status === 403 ? 'Classroom locked' : 'Classroom unavailable'}
          hint={(error as Error)?.message}
        />
        <div className="flex justify-center"><Link to="/app/academy"><Button variant="outline">Back to Academy</Button></Link></div>
      </Card>
    );
  }

  const { course, modules, enrollment } = data;
  // Half-paid students can work through the first half of the syllabus.
  const unlockedUntil = enrollment.isFullyPaid ? modules.length : Math.ceil(modules.length / 2);
  const mod = modules[current];

  return (
    <>
      <Link to="/app/academy" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-cyan-600"><ArrowLeft className="h-4 w-4" /> Academy</Link>
      <PageHeader eyebrow="Classroom" title={course.title} subtitle={course.description} />
      {!enrollment.isFullyPaid && (
        <Card className="mb-4 border-amber-500/30 py-4 sm:py-4">
          <p className="text-sm">
            You're on the installment plan — modules {unlockedUntil + 1}–{modules.length} unlock once your balance of{' '}
            <strong>{naira(course.fullPrice - enrollment.paidAmount)}</strong> is verified.
          </p>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="p-3 sm:p-3">
          <ol className="space-y-1">
            {modules.map((m, i) => {
              const locked = i >= unlockedUntil;
              return (
                <li key={m.week}>
                  <button
                    disabled={locked}
                    onClick={() => setCurrent(i)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50',
                      i === current ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' : 'hover:bg-slate-100 dark:hover:bg-white/5',
                    )}
                  >
                    {locked ? <Lock className="h-4 w-4" /> : i < current ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4" />}
                    <span className="flex-1"><span className="block text-[11px] text-slate-500">Week {m.week}</span>{m.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Card>
        <Card>
          <Badge tone="cyan">Week {mod.week}</Badge>
          <h2 className="mt-3 font-display text-2xl font-bold">{mod.title}</h2>
          <div className="mt-5 grid aspect-video place-items-center rounded-3xl bg-gradient-to-br from-slate-900 to-blue-950 text-white">
            <div className="text-center">
              <PlayCircle className="mx-auto h-16 w-16 text-cyan-400" />
              <p className="mt-2 text-sm text-slate-300">Live session recordings appear here after each class.</p>
            </div>
          </div>
          <ul className="mt-5 space-y-2">
            {Array.from({ length: mod.lessons }, (_, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10">
                <PlayCircle className="h-4 w-4 text-cyan-500" /> Lesson {i + 1}: {mod.title} — part {i + 1}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex justify-end">
            <Button disabled={current + 1 >= unlockedUntil} onClick={() => setCurrent(current + 1)}>Next module</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
