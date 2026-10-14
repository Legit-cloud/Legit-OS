import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap, Plus, Pencil, Trash2, Users, Clock, BookOpen, Search
} from 'lucide-react';
import {
  Badge, Button, Card, Field, Loading, Modal, PageHeader,
  StatCard, Empty
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { naira } from '../../lib/format';
import { useSocketEvent } from '../../lib/socket';
import { toast } from '../../store/toast';

interface AdminCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: string;
  durationWeeks: number;
  fullPrice: number;
  halfPrice: number;
  modulesJson: string;
  _count?: { enrolledUsers: number };
}

type CourseDraft = {
  id?: string;
  title: string;
  description: string;
  level: string;
  durationWeeks: number;
  fullPrice: number;
  halfPrice: number;
  slug?: string;
};

function CourseModalForm({ draft, onDone }: { draft: CourseDraft; onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(draft);

  const save = useMutation({
    mutationFn: () => {
      const { id, ...body } = form;
      return id ? api(`/admin/courses/${id}`, { method: 'PATCH', body }) : api('/admin/courses', { body });
    },
    onSuccess: () => {
      toast.success(form.id ? 'Course updated' : 'New course created');
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] });
      qc.invalidateQueries({ queryKey: ['courses'] });
      onDone();
    },
    onError: (e) => toast.error('Failed to save course', errorMessage(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  const handleFullPriceChange = (val: number) => {
    setForm({
      ...form,
      fullPrice: val,
      halfPrice: Math.round(val / 2),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Course Title" hint="e.g. Full-Stack Web Development, Cybersecurity Operations">
        <input
          className="field"
          required
          minLength={2}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </Field>

      <Field label="Description & Overview">
        <textarea
          className="field resize-none h-24"
          required
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Level">
          <select
            className="field"
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="All Levels">All Levels</option>
          </select>
        </Field>

        <Field label="Duration (Weeks)">
          <input
            className="field font-mono"
            type="number"
            min={1}
            max={52}
            required
            value={form.durationWeeks}
            onChange={(e) => setForm({ ...form, durationWeeks: Number(e.target.value) })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Full Course Fee (₦)" hint="Total tuition price">
          <input
            className="field font-mono"
            type="number"
            min={0}
            step={1000}
            required
            value={form.fullPrice}
            onChange={(e) => handleFullPriceChange(Number(e.target.value))}
          />
        </Field>

        <Field label="Installment Fee (₦)" hint="50% deposit amount">
          <input
            className="field font-mono"
            type="number"
            min={0}
            step={500}
            required
            value={form.halfPrice}
            onChange={(e) => setForm({ ...form, halfPrice: Number(e.target.value) })}
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-3">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={save.isPending}>
          {form.id ? 'Save changes' : 'Create course'}
        </Button>
      </div>
    </form>
  );
}

export default function AdminCourses() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CourseDraft | null>(null);

  useSocketEvent('courses:changed', () => {
    qc.invalidateQueries({ queryKey: ['admin', 'courses'] });
    qc.invalidateQueries({ queryKey: ['courses'] });
  });

  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: () => api<AdminCourse[]>('/admin/courses'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api<{ deleted: boolean }>(`/admin/courses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Course deleted');
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] });
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (e) => toast.error('Delete failed', errorMessage(e)),
  });

  if (isLoading || !courses) return <Loading label="Loading academy courses…" />;

  const filtered = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      c.level.toLowerCase().includes(search.toLowerCase()),
  );

  const totalEnrollments = courses.reduce((sum, c) => sum + (c._count?.enrolledUsers ?? 0), 0);
  const avgPrice = courses.length ? Math.round(courses.reduce((sum, c) => sum + c.fullPrice, 0) / courses.length) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Academy & Pricing"
        title="Academy Courses"
        subtitle="Manage tech courses, tuition pricing, installment structures, and enrollment details live."
        actions={
          <Button
            onClick={() =>
              setEditing({
                title: '',
                description: '',
                level: 'Beginner',
                durationWeeks: 8,
                fullPrice: 70000,
                halfPrice: 35000,
              })
            }
          >
            <Plus className="h-4 w-4" /> Add Course
          </Button>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          icon={<GraduationCap className="h-5 w-5" />}
          label="Active Courses"
          value={courses.length}
          hint="Offered on Member Terminal"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total Enrollments"
          value={totalEnrollments}
          hint="Students currently enrolled"
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Average Tuition"
          value={naira(avgPrice)}
          hint="Per enrolled student"
        />
      </div>

      {/* Search */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search course title, level, keywords…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-white/5"
          />
        </div>
        <p className="text-xs text-slate-500">
          Tuition and course updates reflect live on the <strong>Academy</strong> member page.
        </p>
      </div>

      {/* Course Cards */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <Card key={c.id} className="relative flex flex-col justify-between overflow-hidden transition-all hover:border-cyan-500/50">
            <div>
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-3 text-cyan-600 dark:text-cyan-400">
                  <GraduationCap className="h-6 w-6" />
                </span>
                <Badge tone="cyan">{c.level}</Badge>
              </div>

              <div className="mt-4">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {c.title}
                </h3>
                <p className="mt-1 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">
                  {c.description}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-cyan-500" />
                    {c.durationWeeks} weeks
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-cyan-500" />
                    {c._count?.enrolledUsers ?? 0} enrolled
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-white/10">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="font-display text-xl font-bold text-slate-900 dark:text-white">
                    {naira(c.fullPrice)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    or 2× {naira(c.halfPrice)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(c)}
                    aria-label={`Edit ${c.title}`}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete course ${c.title}?`)) remove.mutate(c.id);
                    }}
                    aria-label={`Delete ${c.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full">
            <Empty
              icon={<GraduationCap className="h-10 w-10 text-slate-400" />}
              title="No courses found"
              hint={search ? 'Try clearing your search query.' : 'Click "Add Course" above to create your first academy course.'}
            />
          </div>
        )}
      </div>

      {/* Edit / Add Modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit ${editing.title}` : 'Add Academy Course'}
      >
        {editing && (
          <CourseModalForm
            key={editing.id ?? 'new-course'}
            draft={editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </>
  );
}
