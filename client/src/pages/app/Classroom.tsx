import { useState, useMemo, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, Circle, Lock, PlayCircle, Maximize2, Minimize2,
  ChevronDown, ChevronRight, Download, ExternalLink, FileText, Github,
  MessageSquare, Sparkles, Clock, BookOpen, Check, Send
} from 'lucide-react';
import { Badge, Button, Card, Empty, Loading, PageHeader, cn } from '../../components/ui';
import { api, ApiError, errorMessage } from '../../lib/api';
import { naira, timeAgo } from '../../lib/format';
import { playChime } from '../../lib/soundAndNotification';
import { useSocketEvent } from '../../lib/socket';
import type { ClassroomData, Lesson, LessonResource } from '../../lib/types';
import { toast } from '../../store/toast';

interface DiscussionItem {
  id: string;
  channel?: string;
  lessonId: string;
  userId: string;
  userName: string;
  userRole: string;
  userAvatar?: string | null;
  text: string;
  createdAt: string;
}

function getEmbedUrl(url?: string): string | null {
  if (!url) return null;
  // YouTube watch or short URLs
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=0&rel=0&modestbranding=1`;
  }
  // Vimeo URLs
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0`;
  }
  // Loom URLs
  const loomMatch = url.match(/loom\.com\/share\/([a-f0-9]+)/);
  if (loomMatch) {
    return `https://www.loom.com/embed/${loomMatch[1]}`;
  }
  return null;
}

function ResourcePill({ res }: { res: LessonResource }) {
  const icon = () => {
    switch (res.type) {
      case 'GITHUB':
        return <Github className="h-4 w-4 text-slate-800 dark:text-white" />;
      case 'SLIDES':
        return <FileText className="h-4 w-4 text-amber-500" />;
      case 'DOWNLOAD':
        return <Download className="h-4 w-4 text-emerald-500" />;
      case 'DOCS':
      default:
        return <ExternalLink className="h-4 w-4 text-cyan-500" />;
    }
  };

  return (
    <a
      href={res.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3.5 shadow-sm transition hover:border-cyan-500 hover:bg-cyan-500/5 dark:border-white/10 dark:bg-slate-900/50"
    >
      <div className="flex items-center gap-2.5">
        <div className="rounded-xl bg-slate-100 p-2 dark:bg-white/5">{icon()}</div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{res.title}</p>
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">{res.type}</span>
        </div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
    </a>
  );
}

export default function Classroom() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [currentModuleIdx, setCurrentModuleIdx] = useState(0);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'guide' | 'resources' | 'discussion'>('guide');
  const [theaterMode, setTheaterMode] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({ 0: true });

  const [newComment, setNewComment] = useState('');

  const { data: discussions = [] } = useQuery({
    queryKey: ['classroom-discussions', id],
    queryFn: () => api<DiscussionItem[]>(`/courses/${id}/discussions`),
    enabled: !!id,
  });

  useSocketEvent('classroom:question', (payload: any) => {
    if (payload?.courseId === id) {
      qc.invalidateQueries({ queryKey: ['classroom-discussions', id] });
    }
  });

  const postDiscussion = useMutation({
    mutationFn: ({ lessonId, text }: { lessonId: string; text: string }) =>
      api<DiscussionItem>(`/courses/${id}/lessons/${lessonId}/discussions`, {
        method: 'POST',
        body: { text },
      }),
    onSuccess: () => {
      setNewComment('');
      toast.success('Question Sent', 'Your question has been posted and notified to the instructor and hub admins.');
      qc.invalidateQueries({ queryKey: ['classroom-discussions', id] });
    },
    onError: (e) => toast.error('Could not post question', errorMessage(e)),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['classroom', id],
    queryFn: () => api<ClassroomData>(`/courses/${id}/classroom`),
    retry: false,
  });

  const toggleLessonMutation = useMutation({
    mutationFn: (lessonId: string) =>
      api<{
        ok: boolean;
        completed: boolean;
        pointsAwarded: number;
        completedLessonIds: string[];
        progressPercent: number;
      }>(`/courses/${id}/lessons/${lessonId}/toggle`, { method: 'POST', body: {} }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['classroom', id] });
      qc.invalidateQueries({ queryKey: ['courses'] });
      if (res.completed) {
        playChime('completed');
        toast.success(
          'Lesson Completed!',
          res.pointsAwarded > 0 ? `+${res.pointsAwarded} Hub Points earned! Keep it up!` : 'Progress recorded.'
        );
      } else {
        toast.info('Lesson Marked Incomplete');
      }
    },
    onError: (e) => toast.error('Failed to update lesson progress', errorMessage(e)),
  });

  // Flat list of all accessible lessons for next/previous navigation
  const allLessons = useMemo(() => {
    if (!data?.modules) return [];
    const unlockedCount = data.enrollment.isFullyPaid ? data.modules.length : Math.ceil(data.modules.length / 2);
    const list: { moduleIdx: number; lesson: Lesson }[] = [];
    data.modules.slice(0, unlockedCount).forEach((mod, mIdx) => {
      (mod.lessons || []).forEach((les) => {
        list.push({ moduleIdx: mIdx, lesson: les });
      });
    });
    return list;
  }, [data?.modules, data?.enrollment.isFullyPaid]);

  if (isLoading) return <Loading label="Entering hub classroom…" />;
  if (error || !data) {
    return (
      <Card className="max-w-xl mx-auto my-12 p-8 text-center border-amber-500/30">
        <Empty
          icon={<Lock className="h-12 w-12 text-amber-500" />}
          title={error instanceof ApiError && error.status === 403 ? 'Classroom Locked' : 'Classroom Unavailable'}
          hint={(error as Error)?.message || 'Enrollment is required to access course content.'}
        />
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/app/academy">
            <Button variant="primary">View Academy Courses</Button>
          </Link>
          <Link to="/app/finance">
            <Button variant="outline">Check Invoices</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const { course, modules, enrollment, completedLessonIds, progressPercent } = data;
  const unlockedUntil = enrollment.isFullyPaid ? modules.length : Math.ceil(modules.length / 2);
  const currentModule = modules[currentModuleIdx] || modules[0];

  // Active lesson fallback
  const activeLesson: Lesson | undefined =
    allLessons.find((l) => l.lesson.id === selectedLessonId)?.lesson ||
    currentModule?.lessons?.[0] ||
    allLessons[0]?.lesson;

  const isCurrentCompleted = activeLesson ? completedLessonIds.includes(activeLesson.id) : false;

  const currentFlatIdx = allLessons.findIndex((l) => l.lesson.id === activeLesson?.id);
  const prevLesson = currentFlatIdx > 0 ? allLessons[currentFlatIdx - 1] : null;
  const nextLesson = currentFlatIdx >= 0 && currentFlatIdx < allLessons.length - 1 ? allLessons[currentFlatIdx + 1] : null;

  const handleSelectLesson = (mIdx: number, lessonId: string) => {
    setCurrentModuleIdx(mIdx);
    setSelectedLessonId(lessonId);
    setExpandedModules((prev) => ({ ...prev, [mIdx]: true }));
  };

  const handlePostComment = (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!activeLesson?.id) {
      toast.error('Select a lesson', 'Please select a lesson to ask a question about.');
      return;
    }
    postDiscussion.mutate({
      lessonId: activeLesson.id,
      text: newComment.trim(),
    });
  };

  const embedUrl = getEmbedUrl(activeLesson?.videoUrl);

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb & Progress Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/app/academy"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-cyan-600 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Academy
        </Link>

        {/* Global Progress Pill */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              {completedLessonIds.length} of {allLessons.length} Lessons Completed
            </p>
            <p className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">{progressPercent}% Progress</p>
          </div>
          <div className="h-2.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10 sm:w-32">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <PageHeader
        eyebrow={`Classroom · ${course.level}`}
        title={course.title}
        subtitle={course.description}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTheaterMode(!theaterMode)}
            title={theaterMode ? 'Exit theater mode' : 'Theater / Cinema mode'}
          >
            {theaterMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{theaterMode ? 'Normal View' : 'Theater Mode'}</span>
          </Button>
        }
      />

      {/* Installment Gating Notice */}
      {!enrollment.isFullyPaid && (
        <Card className="border-amber-500/30 bg-amber-500/5 py-3 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Lock className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-slate-700 dark:text-slate-300">
              You are on the installment plan. Modules 1–{unlockedUntil} are unlocked. Settle your outstanding balance of{' '}
              <strong className="text-amber-600 dark:text-amber-400 font-mono">
                {naira(course.fullPrice - enrollment.paidAmount)}
              </strong>{' '}
              to unlock modules {unlockedUntil + 1}–{modules.length}.
            </p>
          </div>
          <Link to="/app/finance" className="shrink-0">
            <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
              Pay Balance
            </Button>
          </Link>
        </Card>
      )}

      {/* Main Classroom Workspace Grid */}
      <div className={cn('grid gap-6', theaterMode ? 'grid-cols-1' : 'lg:grid-cols-[1fr_360px]')}>
        {/* Left: Video Player & Lesson Content Stage */}
        <div className="space-y-5">
          {/* Video Player Card */}
          <Card className="overflow-hidden p-0 sm:p-0 border-cyan-500/20 shadow-2xl bg-slate-950">
            <div className="relative aspect-video w-full bg-slate-950">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={activeLesson?.title || 'Lesson Video'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              ) : activeLesson?.videoUrl?.endsWith('.mp4') ? (
                <video
                  src={activeLesson.videoUrl}
                  controls
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
                  <div className="rounded-full bg-cyan-500/10 p-4 border border-cyan-500/20 mb-3">
                    <PlayCircle className="h-10 w-10 text-cyan-400" />
                  </div>
                  <h3 className="font-display text-lg font-bold">Class Session Video</h3>
                  <p className="mt-1 max-w-sm text-xs text-slate-400">
                    Live classroom recordings and lab walkthroughs appear here immediately after each physical studio session.
                  </p>
                  {activeLesson?.durationMinutes && (
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-cyan-300">
                      <Clock className="h-3.5 w-3.5" /> Estimated Duration: {activeLesson.durationMinutes} mins
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Lesson Title & Completion Controls */}
            <div className="border-t border-slate-800 bg-slate-900/90 p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-white">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                  Week {currentModule.week} · Lesson
                </span>
                <h2 className="mt-0.5 font-display text-xl font-bold leading-tight">
                  {activeLesson?.title || 'Course Overview'}
                </h2>
                {activeLesson?.durationMinutes && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5" /> {activeLesson.durationMinutes} minutes lecture
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeLesson && (
                  <Button
                    size="sm"
                    variant={isCurrentCompleted ? 'success' : 'primary'}
                    loading={toggleLessonMutation.isPending}
                    onClick={() => toggleLessonMutation.mutate(activeLesson.id)}
                  >
                    {isCurrentCompleted ? (
                      <>
                        <Check className="h-4 w-4" /> Completed
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Mark as Completed (+10 pts)
                      </>
                    )}
                  </Button>
                )}

                {prevLesson && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/15 text-white hover:bg-white/10"
                    onClick={() => handleSelectLesson(prevLesson.moduleIdx, prevLesson.lesson.id)}
                  >
                    Previous
                  </Button>
                )}

                {nextLesson && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/15 text-white hover:bg-white/10"
                    onClick={() => handleSelectLesson(nextLesson.moduleIdx, nextLesson.lesson.id)}
                  >
                    Next Lesson
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Interactive Lesson Tabs */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition',
                  activeTab === 'guide'
                    ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                )}
              >
                <BookOpen className="h-4 w-4" /> Lesson Guide & Notes
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('resources')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition',
                  activeTab === 'resources'
                    ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                )}
              >
                <Download className="h-4 w-4" /> Resources ({activeLesson?.resources?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('discussion')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition',
                  activeTab === 'discussion'
                    ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                )}
              >
                <MessageSquare className="h-4 w-4" /> Discussion & Q&A
              </button>
            </div>

            {/* Tab 1: Lesson Guide */}
            {activeTab === 'guide' && (
              <div className="pt-4 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Lesson Overview
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {activeLesson?.summary || currentModule.description}
                  </p>
                </div>

                {activeLesson?.keyPoints && activeLesson.keyPoints.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Key Takeaways & Core Skills
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {activeLesson.keyPoints.map((point, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                        >
                          <CheckCircle2 className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Resources & Downloads */}
            {activeTab === 'resources' && (
              <div className="pt-4 space-y-3">
                {activeLesson?.resources && activeLesson.resources.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {activeLesson.resources.map((res) => (
                      <ResourcePill key={res.id} res={res} />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No downloadable assets attached to this specific lesson. Check the week summary.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Q&A Discussion Thread */}
            {activeTab === 'discussion' && (
              <div className="pt-4 space-y-4">
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3 flex items-center justify-between text-xs dark:border-cyan-500/20">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <MessageSquare className="h-4 w-4 text-cyan-500 shrink-0" />
                    <span>Questions posted here trigger an instant notification to hub instructors & administrators.</span>
                  </div>
                </div>

                <form onSubmit={handlePostComment} className="flex gap-2">
                  <input
                    className="field rounded-2xl text-xs flex-1"
                    placeholder={`Ask a question about ${activeLesson?.title || 'this lecture'}...`}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={postDiscussion.isPending}
                  />
                  <Button size="sm" type="submit" loading={postDiscussion.isPending}>
                    <Send className="h-3.5 w-3.5" /> Post
                  </Button>
                </form>

                {(() => {
                  const thread = discussions.filter((d) => d.lessonId === activeLesson?.id);
                  if (thread.length === 0) {
                    return (
                      <div className="py-8 text-center text-xs text-slate-400">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">No questions posted yet for this lesson</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Be the first to ask a question or leave notes for your instructor and peers.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {thread.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs dark:border-white/10 dark:bg-white/5 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-cyan-500/20 grid place-items-center text-cyan-600 dark:text-cyan-400 font-bold text-[10px]">
                                {item.userName.charAt(0)}
                              </div>
                              <span className="font-semibold text-slate-900 dark:text-white">{item.userName}</span>
                              {item.userRole === 'INSTRUCTOR' || item.userRole === 'ADMIN' ? (
                                <Badge tone="cyan">Instructor</Badge>
                              ) : (
                                <Badge tone="slate">Member</Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">{timeAgo(item.createdAt)}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 pl-8 leading-relaxed whitespace-pre-wrap">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </Card>
        </div>

        {/* Right Sidebar: Complete Course Curriculum Accordion */}
        <div className="space-y-4">
          <Card className="p-4 sm:p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-cyan-500" /> Course Syllabus
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {modules.length} Weeks
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {modules.map((mod, mIdx) => {
                const locked = mIdx >= unlockedUntil;
                const isExpanded = !!expandedModules[mIdx];
                const modCompletedCount = (mod.lessons || []).filter((l) => completedLessonIds.includes(l.id)).length;
                const totalModLessons = mod.lessons?.length || 0;
                const isModAllCompleted = totalModLessons > 0 && modCompletedCount === totalModLessons;

                return (
                  <div
                    key={mod.id || mIdx}
                    className={cn(
                      'rounded-2xl border transition overflow-hidden',
                      mIdx === currentModuleIdx
                        ? 'border-cyan-500/40 bg-cyan-500/5'
                        : 'border-slate-200 bg-white/40 dark:border-white/10 dark:bg-white/5',
                      locked && 'opacity-60 bg-slate-100/50 dark:bg-black/20'
                    )}
                  >
                    {/* Module Accordion Header */}
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        setExpandedModules((prev) => ({ ...prev, [mIdx]: !prev[mIdx] }));
                        if (!locked) setCurrentModuleIdx(mIdx);
                      }}
                      className="flex w-full items-center justify-between p-3 text-left transition hover:bg-slate-100/50 dark:hover:bg-white/5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {locked ? (
                          <Lock className="h-4 w-4 text-amber-500 shrink-0" />
                        ) : isModAllCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-slate-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500">
                            Week {mod.week}
                          </span>
                          <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                            {mod.title}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {totalModLessons > 0 && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {modCompletedCount}/{totalModLessons}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Lesson Items inside expanded module */}
                    {isExpanded && !locked && (
                      <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-white/5 dark:border-white/5 bg-slate-50/40 dark:bg-black/20">
                        {(mod.lessons || []).map((les, lIdx) => {
                          const isCompleted = completedLessonIds.includes(les.id);
                          const isSelected = activeLesson?.id === les.id;

                          return (
                            <button
                              key={les.id || lIdx}
                              type="button"
                              onClick={() => handleSelectLesson(mIdx, les.id)}
                              className={cn(
                                'flex w-full items-center justify-between px-4 py-2.5 text-left text-xs transition',
                                isSelected
                                  ? 'bg-cyan-500/15 font-semibold text-cyan-700 dark:text-cyan-300'
                                  : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                {isCompleted ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                ) : isSelected ? (
                                  <PlayCircle className="h-3.5 w-3.5 text-cyan-500 shrink-0 animate-pulse" />
                                ) : (
                                  <Circle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className="truncate">{les.title}</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                {les.durationMinutes}m
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
