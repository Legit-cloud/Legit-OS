import { useState, useMemo, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap, Plus, Pencil, Trash2, Users, Clock, BookOpen, Search,
  Layers, Video, Check, X, ChevronRight, ExternalLink
} from 'lucide-react';
import {
  Badge, Button, Field, Loading, Modal, PageHeader,
  StatCard, Empty, cn
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDate, naira } from '../../lib/format';
import { useSocketEvent } from '../../lib/socket';
import { getCourseImage } from '../../lib/courseImages';
import type { CourseModule, Lesson, LessonResource } from '../../lib/types';
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
          placeholder="e.g. Full-Stack Web Development"
          onFocus={(e) => e.target.select()}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </Field>

      <Field label="Description & Overview">
        <textarea
          className="field resize-none h-24"
          required
          placeholder="Enter a brief course overview..."
          onFocus={(e) => e.target.select()}
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
          </select>
        </Field>

        <Field label="Duration (Weeks)">
          <input
            className="field"
            type="number"
            min={1}
            max={52}
            required
            onFocus={(e) => e.target.select()}
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
            onFocus={(e) => e.target.select()}
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
            onFocus={(e) => e.target.select()}
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

function CurriculumModal({
  course,
  onClose,
}: {
  course: AdminCourse;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const initialModules: CourseModule[] = useMemo(() => {
    try {
      const parsed = JSON.parse(course.modulesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [course.modulesJson]);

  const [modules, setModules] = useState<CourseModule[]>(initialModules);
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [editingLessonIdx, setEditingLessonIdx] = useState<number | null>(null);

  const saveCurriculum = useMutation({
    mutationFn: () =>
      api(`/admin/courses/${course.id}/curriculum`, {
        method: 'PUT',
        body: { modules },
      }),
    onSuccess: () => {
      toast.success('Curriculum Updated', `Saved ${modules.length} modules for ${course.title}.`);
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] });
      qc.invalidateQueries({ queryKey: ['courses'] });
      onClose();
    },
    onError: (e) => toast.error('Failed to save curriculum', errorMessage(e)),
  });

  const activeModule = modules[activeModuleIdx];

  const addModule = () => {
    const nextWeek = modules.length + 1;
    const newMod: CourseModule = {
      id: `mod-${Date.now()}`,
      week: nextWeek,
      title: '',
      description: '',
      lessons: [
        {
          id: `les-${Date.now()}-1`,
          title: '',
          durationMinutes: 30,
          videoUrl: '',
          summary: '',
          keyPoints: [],
          resources: [],
        },
      ],
    };
    const next = [...modules, newMod];
    setModules(next);
    setActiveModuleIdx(next.length - 1);
    setEditingLessonIdx(0);
  };

  const removeModule = (idx: number) => {
    if (!confirm('Remove this entire module and all its lessons?')) return;
    const next = modules.filter((_, i) => i !== idx).map((m, i) => ({ ...m, week: i + 1 }));
    setModules(next);
    setActiveModuleIdx(Math.max(0, idx - 1));
    setEditingLessonIdx(null);
  };

  const addLesson = () => {
    if (!activeModule) return;
    const newLesson: Lesson = {
      id: `les-${Date.now()}`,
      title: '',
      durationMinutes: 30,
      videoUrl: '',
      summary: '',
      keyPoints: [],
      resources: [],
    };
    const updatedLessons = [...(activeModule.lessons || []), newLesson];
    const nextModules = modules.map((m, i) =>
      i === activeModuleIdx ? { ...m, lessons: updatedLessons } : m
    );
    setModules(nextModules);
    setEditingLessonIdx(updatedLessons.length - 1);
  };

  const removeLesson = (lessonIdx: number) => {
    if (!activeModule) return;
    const updatedLessons = activeModule.lessons.filter((_, i) => i !== lessonIdx);
    const nextModules = modules.map((m, i) =>
      i === activeModuleIdx ? { ...m, lessons: updatedLessons } : m
    );
    setModules(nextModules);
    setEditingLessonIdx(null);
  };

  const updateCurrentLesson = (patch: Partial<Lesson>) => {
    if (!activeModule || editingLessonIdx === null) return;
    const updatedLessons = activeModule.lessons.map((les, i) =>
      i === editingLessonIdx ? { ...les, ...patch } : les
    );
    const nextModules = modules.map((m, i) =>
      i === activeModuleIdx ? { ...m, lessons: updatedLessons } : m
    );
    setModules(nextModules);
  };

  const addResource = () => {
    if (!activeModule || editingLessonIdx === null) return;
    const currentLesson = activeModule.lessons[editingLessonIdx];
    const newResource: LessonResource = {
      id: `res-${Date.now()}`,
      title: '',
      url: '',
      type: 'DOCS',
    };
    updateCurrentLesson({
      resources: [...(currentLesson.resources || []), newResource],
    });
  };

  const removeResource = (resIdx: number) => {
    if (!activeModule || editingLessonIdx === null) return;
    const currentLesson = activeModule.lessons[editingLessonIdx];
    updateCurrentLesson({
      resources: (currentLesson.resources || []).filter((_, i) => i !== resIdx),
    });
  };

  const updateResource = (resIdx: number, patch: Partial<LessonResource>) => {
    if (!activeModule || editingLessonIdx === null) return;
    const currentLesson = activeModule.lessons[editingLessonIdx];
    const updated = (currentLesson.resources || []).map((r, i) =>
      i === resIdx ? { ...r, ...patch } : r
    );
    updateCurrentLesson({ resources: updated });
  };

  const currentEditingLesson =
    activeModule && editingLessonIdx !== null ? activeModule.lessons[editingLessonIdx] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <span className="text-xs font-mono uppercase text-cyan-600 font-bold">
            Curriculum Builder
          </span>
          <h3 className="font-display text-lg font-bold text-slate-900">
            {course.title}
          </h3>
          <p className="text-xs text-slate-500">
            Configure modules, lessons, working video URLs, and downloadable resource links.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={addModule}>
          <Plus className="h-4 w-4" /> Add Week / Module
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        {/* Module Sidebar */}
        <div className="space-y-2 border-r border-slate-200 pr-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Modules ({modules.length})
          </p>
          <div className="space-y-1 max-h-[460px] overflow-y-auto">
            {modules.map((m, idx) => (
              <button
                key={m.id || idx}
                type="button"
                onClick={() => {
                  setActiveModuleIdx(idx);
                  setEditingLessonIdx(null);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl p-2.5 text-left text-xs transition',
                  idx === activeModuleIdx
                    ? 'bg-cyan-500/15 font-semibold text-cyan-700'
                    : 'hover:bg-slate-100 text-slate-600'
                )}
              >
                <div className="min-w-0 pr-2">
                  <span className="block text-[10px] font-mono text-slate-400">Week {m.week}</span>
                  <p className="truncate">{m.title?.trim() ? m.title : `Week ${m.week} (Untitled)`}</p>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {m.lessons?.length || 0}L
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Module Editor Stage */}
        <div className="space-y-4">
          {activeModule ? (
            <>
              {/* Module Metadata Form */}
              <div className="grid gap-3 sm:grid-cols-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <Field label={`Week ${activeModule.week} Title`}>
                  <input
                    className="field text-xs"
                    placeholder={`e.g. Week ${activeModule.week} Core Architecture`}
                    onFocus={(e) => e.target.select()}
                    value={activeModule.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setModules(
                        modules.map((m, i) => (i === activeModuleIdx ? { ...m, title } : m))
                      );
                    }}
                  />
                </Field>

                <Field label="Module Description">
                  <input
                    className="field text-xs"
                    placeholder="e.g. Overview of topics and lab exercises covered..."
                    onFocus={(e) => e.target.select()}
                    value={activeModule.description}
                    onChange={(e) => {
                      const description = e.target.value;
                      setModules(
                        modules.map((m, i) => (i === activeModuleIdx ? { ...m, description } : m))
                      );
                    }}
                  />
                </Field>
                <div className="sm:col-span-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="danger"
                    className="px-2.5 py-1 text-xs"
                    onClick={() => removeModule(activeModuleIdx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove Module
                  </Button>
                </div>
              </div>

              {/* Lessons Management */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Lessons in this module ({activeModule.lessons?.length || 0})
                  </h4>
                  <Button size="sm" variant="outline" onClick={addLesson}>
                    <Plus className="h-3.5 w-3.5" /> Add Lesson
                  </Button>
                </div>

                {/* Lesson List Tabs */}
                <div className="flex flex-wrap gap-1.5">
                  {(activeModule.lessons || []).map((les, lIdx) => (
                    <button
                      key={les.id || lIdx}
                      type="button"
                      onClick={() => setEditingLessonIdx(lIdx)}
                      className={cn(
                        'rounded-xl px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1.5',
                        editingLessonIdx === lIdx
                          ? 'bg-cyan-500 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      )}
                    >
                      <Video className="h-3 w-3" />
                      <span className="truncate max-w-[140px]">
                        {les.title?.trim() ? les.title : `Lesson ${lIdx + 1} (Untitled)`}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Active Lesson Detail Editor */}
                {currentEditingLesson && editingLessonIdx !== null && (
                  <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-cyan-700">
                        Editing Lesson {editingLessonIdx + 1}
                      </span>
                      <Button
                        size="sm"
                        variant="danger"
                        className="px-2 py-0.5 text-xs"
                        onClick={() => removeLesson(editingLessonIdx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete Lesson
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Lesson Title">
                        <input
                          className="field text-xs"
                          placeholder="e.g. Semantic HTML5 & Accessible DOM Structure"
                          onFocus={(e) => e.target.select()}
                          value={currentEditingLesson.title}
                          onChange={(e) => updateCurrentLesson({ title: e.target.value })}
                        />
                      </Field>

                      <Field label="Duration (Minutes)">
                        <input
                          type="number"
                          min={1}
                          className="field text-xs font-mono"
                          onFocus={(e) => e.target.select()}
                          value={currentEditingLesson.durationMinutes}
                          onChange={(e) =>
                            updateCurrentLesson({ durationMinutes: Number(e.target.value) })
                          }
                        />
                      </Field>
                    </div>

                    <Field
                      label="Video Lecture URL"
                      hint="Paste YouTube (e.g. https://www.youtube.com/watch?v=...), Vimeo, Loom, or direct .mp4 URL"
                    >
                      <input
                        className="field text-xs font-mono"
                        placeholder="https://www.youtube.com/watch?v=..."
                        onFocus={(e) => e.target.select()}
                        value={currentEditingLesson.videoUrl || ''}
                        onChange={(e) => updateCurrentLesson({ videoUrl: e.target.value })}
                      />
                    </Field>

                    <Field label="Lesson Summary & Notes">
                      <textarea
                        className="field text-xs h-20 resize-none"
                        placeholder="Overview of core concepts, architecture diagrams, and syntax tips..."
                        onFocus={(e) => e.target.select()}
                        value={currentEditingLesson.summary || ''}
                        onChange={(e) => updateCurrentLesson({ summary: e.target.value })}
                      />
                    </Field>

                    <Field
                      label="Key Takeaways & Core Skills (one per line)"
                      hint="Enter bullet points. Each new line appears as a key skill in the student lesson guide."
                    >
                      <textarea
                        className="field text-xs h-20 resize-none"
                        placeholder="Differentiating semantic tags&#10;CSS grid auto-fit layouts&#10;Accessible ARIA labels"
                        onFocus={(e) => e.target.select()}
                        value={(currentEditingLesson.keyPoints || []).join('\n')}
                        onChange={(e) =>
                          updateCurrentLesson({
                            keyPoints: e.target.value.split('\n').filter((l) => l.trim().length > 0),
                          })
                        }
                      />
                    </Field>

                    {/* Resources for this lesson */}
                    <div className="pt-2 space-y-2 border-t border-cyan-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase text-slate-500">
                          Lesson Resources ({currentEditingLesson.resources?.length || 0})
                        </span>
                        <Button size="sm" variant="outline" onClick={addResource}>
                          <Plus className="h-3 w-3" /> Add Link / Resource
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {(currentEditingLesson.resources || []).map((res, rIdx) => (
                          <div
                            key={res.id || rIdx}
                            className="flex flex-col sm:flex-row items-center gap-2 rounded-xl bg-white/70 p-2 border border-slate-200"
                          >
                            <input
                              className="field text-xs py-1 flex-1"
                              placeholder="Resource Title (e.g. Starter GitHub Repository)"
                              onFocus={(e) => e.target.select()}
                              value={res.title}
                              onChange={(e) => updateResource(rIdx, { title: e.target.value })}
                            />
                            <input
                              className="field text-xs py-1 font-mono flex-1"
                              placeholder="URL (e.g. https://github.com/...)"
                              onFocus={(e) => e.target.select()}
                              value={res.url}
                              onChange={(e) => updateResource(rIdx, { url: e.target.value })}
                            />
                            <select
                              className="field text-xs py-1 w-28"
                              value={res.type}
                              onChange={(e) =>
                                updateResource(rIdx, {
                                  type: e.target.value as LessonResource['type'],
                                })
                              }
                            >
                              <option value="GITHUB">GITHUB</option>
                              <option value="SLIDES">SLIDES</option>
                              <option value="DOCS">DOCS</option>
                              <option value="DOWNLOAD">DOWNLOAD</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => removeResource(rIdx)}
                              className="p-1 text-slate-400 hover:text-rose-500"
                              title="Remove resource"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              No modules defined. Click "Add Week / Module" above.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" loading={saveCurriculum.isPending} onClick={() => saveCurriculum.mutate()}>
          <Check className="h-4 w-4" /> Save Curriculum
        </Button>
      </div>
    </div>
  );
}

interface EnrolledStudentItem {
  enrollmentId: string;
  userId: string;
  courseId: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  paidAmount: number;
  isFullyPaid: boolean;
  enrolledAt: string;
}

function EnrolledStudentsModal({
  course,
  onClose,
}: {
  course: AdminCourse;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'course-students', course.id],
    queryFn: () =>
      api<{
        course: { id: string; title: string; fullPrice: number };
        students: EnrolledStudentItem[];
      }>(`/admin/courses/${course.id}/students`),
  });

  const unenroll = useMutation({
    mutationFn: (userId: string) =>
      api(`/admin/courses/${course.id}/students/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Student Unenrolled', 'Student removed from this course.');
      qc.invalidateQueries({ queryKey: ['admin', 'course-students', course.id] });
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] });
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (e) => toast.error('Failed to unenroll student', errorMessage(e)),
  });

  const students = data?.students || [];

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 pb-3">
        <span className="text-xs font-mono uppercase text-cyan-600 font-bold">
          Class Roster & Enrollments
        </span>
        <h3 className="font-display text-lg font-bold text-slate-900">
          {course.title}
        </h3>
        <p className="text-xs text-slate-500">
          Enrolled students ({students.length}) · Manage active enrollment access
        </p>
      </div>

      {isLoading ? (
        <Loading label="Loading enrolled students…" />
      ) : students.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No students are currently enrolled in this course.
        </div>
      ) : (
        <div className="space-y-2 max-h-[460px] overflow-y-auto">
          {students.map((st) => (
            <div
              key={st.enrollmentId}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-slate-900 truncate">
                    {st.fullName}
                  </p>
                  <Badge tone={st.isFullyPaid ? 'green' : 'amber'}>
                    {st.isFullyPaid ? 'Fully Paid' : '50% Installment'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {st.email} {st.phone ? `· ${st.phone}` : ''}
                </p>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Paid {naira(st.paidAmount)} / {naira(course.fullPrice)} · Enrolled {formatDate(st.enrolledAt)}
                </p>
              </div>

              <Button
                size="sm"
                variant="danger"
                className="px-2.5 py-1 text-xs shrink-0"
                loading={unenroll.isPending && unenroll.variables === st.userId}
                onClick={() => {
                  if (
                    confirm(
                      `Remove ${st.fullName} from ${course.title}? Their classroom access and lesson progress will be revoked.`
                    )
                  ) {
                    unenroll.mutate(st.userId);
                  }
                }}
                title="Unenroll student from this course"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Unenroll</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-slate-200">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

export default function AdminCourses() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CourseDraft | null>(null);
  const [managingCurriculum, setManagingCurriculum] = useState<AdminCourse | null>(null);
  const [viewingStudents, setViewingStudents] = useState<AdminCourse | null>(null);

  useSocketEvent('courses:changed', () => {
    qc.invalidateQueries({ queryKey: ['admin', 'courses'] });
    qc.invalidateQueries({ queryKey: ['courses'] });
  });

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: () => api<AdminCourse[]>('/admin/courses'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/courses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Course removed');
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] });
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (e) => toast.error('Failed to delete course', errorMessage(e)),
  });

  const filtered = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      c.level.toLowerCase().includes(search.toLowerCase())
  );

  const totalEnrollments = courses.reduce((acc, c) => acc + (c._count?.enrolledUsers ?? 0), 0);
  const avgPrice = courses.length ? Math.round(courses.reduce((acc, c) => acc + c.fullPrice, 0) / courses.length) : 0;

  if (isLoading) return <Loading />;

  return (
    <>
      <PageHeader
        eyebrow="Academy Management"
        title="Courses & Tuition"
        subtitle="Manage tech education courses, curriculums, lesson videos, and installment pricing."
        actions={
          <Button
            variant="primary"
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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search course title, level, keywords…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field rounded-full pl-10 text-sm"
          />
        </div>
        <p className="text-xs text-slate-500 font-mono">
          <span className="text-cyan-500">●</span> Tuition, lesson videos, and curriculum updates reflect live in the <strong className="text-slate-700">Classroom</strong>.
        </p>
      </div>

      {/* Course Cards Grid */}
      <div className="mt-6 grid gap-6 grid-cols-1 lg:grid-cols-2">
        {filtered.map((c) => {
          let moduleCount = 0;
          let lessonCount = 0;
          try {
            const parsed = JSON.parse(c.modulesJson) as CourseModule[];
            if (Array.isArray(parsed)) {
              moduleCount = parsed.length;
              lessonCount = parsed.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
            }
          } catch {
            moduleCount = 0;
            lessonCount = 0;
          }

          return (
            <div
              key={c.id}
              className="bento-card group relative flex flex-col justify-between overflow-hidden p-0 transition-all hover:border-blue-500/50 hover:shadow-blue-500/10"
            >
              <div>
                {/* Course Photography Header Banner */}
                <div className="relative h-40 w-full overflow-hidden bg-slate-900">
                  <img
                    src={getCourseImage(c.slug, c.title)}
                    alt={c.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />

                  {/* Overlay Badges */}
                  <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/90 text-white backdrop-blur-md shadow-md">
                      <GraduationCap className="h-4 w-4" />
                    </span>
                    <Badge tone="blue">{c.level}</Badge>
                  </div>

                  <div className="absolute top-3.5 right-3.5">
                    <Link
                      to={`/app/academy/${c.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition hover:border-blue-400 hover:bg-blue-600/80"
                      title="Preview student classroom view"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Preview</span>
                    </Link>
                  </div>
                </div>

                {/* Course Title & Description */}
                <div className="p-6 pb-2">
                  <h3 className="font-display text-xl font-bold text-slate-900 leading-snug">
                    {c.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600 leading-relaxed">
                    {c.description}
                  </p>

                  {/* Course Metadata Badges */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-medium border border-slate-200/50">
                      <Clock className="h-3.5 w-3.5 text-cyan-500" />
                      {c.durationWeeks} weeks
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-medium border border-slate-200/50">
                      <Layers className="h-3.5 w-3.5 text-cyan-500" />
                      {moduleCount} modules · {lessonCount} lessons
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-medium border border-slate-200/50">
                      <Users className="h-3.5 w-3.5 text-cyan-500" />
                      {c._count?.enrolledUsers ?? 0} enrolled
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Pricing, Primary Curriculum Banner & Action Tiles */}
              <div className="p-6 pt-0">
                <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
                {/* Tuition & Installment Box */}
                <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-4 border border-slate-200/60">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                      Full Tuition
                    </span>
                    <p className="font-display text-2xl font-bold text-slate-900 leading-tight">
                      {naira(c.fullPrice)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                      Installment Plan
                    </span>
                    <p className="text-sm font-bold text-blue-600 font-mono">
                      2 × {naira(c.halfPrice)}
                    </p>
                  </div>
                </div>

                {/* Primary Action Banner: Manage Curriculum & Lessons */}
                <button
                  type="button"
                  onClick={() => setManagingCurriculum(c)}
                  className="group flex w-full items-center justify-between rounded-2xl border border-blue-500/40 bg-blue-50/60 p-3.5 text-left transition-all hover:border-blue-500 hover:bg-blue-100/60 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/30 group-hover:scale-105 transition-transform">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          Curriculum & Lessons
                        </span>
                        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-mono font-bold text-blue-700 shrink-0">
                          {moduleCount} {moduleCount === 1 ? 'module' : 'modules'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        Edit syllabus modules, video URLs, notes & resources
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform pr-1 shrink-0 ml-2">
                    Manage <ChevronRight className="h-4 w-4" />
                  </span>
                </button>

                {/* Secondary Action Grid: Class Roster, Edit Course Details, Delete */}
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  {/* Class Roster */}
                  <button
                    type="button"
                    onClick={() => setViewingStudents(c)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-cyan-500 hover:bg-cyan-50/50 hover:text-cyan-600"
                    title="View class roster & manage student enrollments"
                  >
                    <Users className="h-4 w-4 text-cyan-500 shrink-0" />
                    <span className="truncate">Roster</span>
                    <span className="rounded-full bg-slate-200/80 px-1.5 py-0.2 font-mono text-[10px] font-bold shrink-0">
                      {c._count?.enrolledUsers ?? 0}
                    </span>
                  </button>

                  {/* Edit Details */}
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-cyan-500 hover:bg-cyan-50/50 hover:text-cyan-600"
                    title="Edit course title, description, level, and tuition"
                  >
                    <Pencil className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="truncate">Edit Details</span>
                  </button>

                  {/* Delete Course */}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete course "${c.title}"? This cannot be undone.`)) {
                        remove.mutate(c.id);
                      }
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-600 hover:text-white"
                    title="Delete course"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
        })}

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

      {/* Edit / Add Course Modal */}
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

      {/* Curriculum Manager Modal */}
      <Modal
        open={!!managingCurriculum}
        onClose={() => setManagingCurriculum(null)}
        title="Course Curriculum & Lessons"
        wide
      >
        {managingCurriculum && (
          <CurriculumModal
            key={managingCurriculum.id}
            course={managingCurriculum}
            onClose={() => setManagingCurriculum(null)}
          />
        )}
      </Modal>

      {/* Enrolled Students Modal */}
      <Modal
        open={!!viewingStudents}
        onClose={() => setViewingStudents(null)}
        title="Class Roster & Students"
        wide
      >
        {viewingStudents && (
          <EnrolledStudentsModal
            key={viewingStudents.id}
            course={viewingStudents}
            onClose={() => setViewingStudents(null)}
          />
        )}
      </Modal>
    </>
  );
}
