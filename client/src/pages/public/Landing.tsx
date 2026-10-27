import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { animate, AnimatePresence, motion, useInView } from 'framer-motion';
import {
  ArrowRight, ChevronDown, ChevronRight, Clock, Mail, MapPin, Menu, Phone, Quote, X, ArrowUpRight, CheckCircle2, Copy, ExternalLink, Send,
} from 'lucide-react';
import { Button, Logo, Modal, Tabs, cn } from '../../components/ui';
import { ThemeToggle } from '../../components/ThemeToggle';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../store/auth';
import { toast } from '../../store/toast';
import {
  DISCIPLINES, EARN_PILLARS, FACILITIES, FAQS, LEARN_TRACKS, METRICS, NAV, POSTS, STARTUPS, TESTIMONIALS, type StartupCategory,
} from './landingData';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5 },
};

function Header() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const home = user ? '/app' : '/register';

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', href);
      }
      setOpen(false);
    }
  };

  return (
    <header className="fixed inset-x-0 top-4 z-40 px-4">
      <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-slate-200/80 bg-white/80 px-4 py-2.5 shadow-lg shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-[#0d111a]/85 dark:shadow-black/40">
        <Link to="/" aria-label="L.E.G.I.T Innovation Hub home" className="transition hover:opacity-90">
          <Logo />
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.href}
              onClick={(e) => handleNavClick(e, n.href)}
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
            >
              {n.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!user && (
            <Link
              to="/login"
              className="hidden rounded-full px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600 sm:block dark:text-slate-300 dark:hover:text-blue-300"
            >
              Sign in
            </Link>
          )}
          <Link to={home} className="hidden sm:block">
            <Button size="sm" className="px-5 py-2 tracking-wide font-mono text-xs">
              {user ? 'OPEN TERMINAL' : 'JOIN THE HUB'}
            </Button>
          </Link>
          <button
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-white/10"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-auto mt-2 flex max-w-6xl flex-col gap-1 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-2xl md:hidden dark:border-white/10 dark:bg-[#0d111a]/95"
          >
            {NAV.map((n) => (
              <a
                key={n.label}
                href={n.href}
                onClick={(e) => handleNavClick(e, n.href)}
                className="rounded-2xl px-4 py-3 font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-200 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
              >
                {n.label}
              </a>
            ))}
            {!user && (
              <Link
                to="/login"
                className="rounded-2xl px-4 py-3 font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-200 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
              >
                Sign in
              </Link>
            )}
            <Link to={home} className="mt-2">
              <Button className="w-full">{user ? 'OPEN TERMINAL' : 'JOIN THE HUB'}</Button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Counter({ value, prefix = '', suffix }: { value: number; prefix?: string; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, { duration: 1.6, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) });
    return () => controls.stop();
  }, [inView, value]);
  return <span ref={ref}>{prefix}{n}{suffix}</span>;
}

function Hero() {
  const pills = ['Startup Incubation', 'Coworking & Media Labs', 'Python Mastery', 'Pitch Night', '24/7 Power', 'Career Placement'];
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-32 sm:pt-40">
      {/* High-tech ambient background */}
      <div className="light-mesh dark:scanline-grid absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
      <div className="absolute left-1/2 top-20 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[140px] pointer-events-none dark:bg-blue-500/15" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-50 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-700 dark:border-blue-400/30 dark:bg-blue-950/50 dark:text-blue-300">
            <span>Ibadan's Premier Incubator & Developer Ecosystem</span>
          </div>

          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl text-slate-900 dark:text-white">
            Driving Nigeria's <span className="gradient-text">Digital Future</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
            Empowering technical founders, building high-impact startups. Full-stack labs, dedicated hardware workstations, and a collaborative network of 550+ builders in the heart of Ibadan.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/register">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/25 transition-colors">
                <span>Join the Hub</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href="#programs">
              <Button size="lg" variant="outline">Explore Programs</Button>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400 border-t border-slate-200/60 pt-6 dark:border-white/10">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> 24/7 Redundant Power
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">100Mbps Dedicated Fibre</span>
            <span>·</span>
            <span className="text-slate-700 dark:text-slate-300">Dedicated Hardware Labs</span>
          </div>
        </motion.div>

        {/* Hero Visual: Coworking Tech Hub Community with Collaborating Innovators */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative"
        >
          {/* Authentic Nigerian Tech Hub & Community Photo Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/50">
            <img
              src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80"
              alt="L.E.G.I.T Innovation Hub members collaborating in tech lab in Nigeria"
              className="h-[420px] w-full object-cover brightness-[0.9] contrast-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
          </div>

          {/* Floating Pill Badges */}
          {pills.map((p, i) => (
            <motion.span
              key={p}
              className={cn(
                'pill absolute hidden shadow-xl backdrop-blur-md sm:inline-flex border border-slate-200/80 bg-white/95 text-slate-800 dark:border-blue-500/30 dark:bg-[#0d111a]/90 dark:text-blue-300 text-xs font-semibold py-1.5 px-3.5',
                [
                  '-left-6 -top-4',
                  '-right-4 top-10',
                  '-left-8 top-1/2',
                  '-right-8 bottom-24',
                  'left-8 -bottom-4',
                  'right-1/4 -top-6',
                ][i]
              )}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3.2 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
            >
              {p}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Metrics() {
  return (
    <section className="px-4 py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-7">
        {METRICS.map((m, i) => (
          <motion.div
            key={m.label}
            {...fadeUp}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="bento-card p-5 text-center group hover:border-blue-500/50"
          >
            <p className="font-display text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
              <Counter {...m} />
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {m.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <motion.div {...fadeUp} className="mx-auto mb-12 max-w-2xl text-center">
      <span className="pill">{eyebrow}</span>
      <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
        {title}
      </h2>
      {body && <p className="mt-3 text-base text-slate-600 dark:text-slate-400">{body}</p>}
    </motion.div>
  );
}

function Learn() {
  return (
    <section id="learn" className="scroll-mt-28 px-4 py-20">
      <SectionTitle
        eyebrow="Pillar 01 · Learn"
        title="Hands-on Tech Education & Academy Tracks"
        body="Master engineering, AI, security, and product design through intensive, cohort-based curriculum guided by senior industry mentors."
      />
      <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2">
        {LEARN_TRACKS.map((t, i) => (
          <motion.article
            key={t.title}
            {...fadeUp}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="bento-card group p-0 overflow-hidden transition-all hover:-translate-y-1 hover:border-blue-500/50 flex flex-col justify-between"
          >
            <div>
              <div className="relative h-44 overflow-hidden">
                <img
                  src={t.image}
                  alt={t.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 brightness-[0.85] contrast-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0d111a] via-white/30 dark:via-[#0d111a]/40 to-transparent" />
                <span className="absolute top-3.5 right-3.5 rounded-full bg-white/90 border border-slate-200 p-2 text-blue-600 backdrop-blur-md dark:bg-blue-500/20 dark:border-blue-400/30 dark:text-blue-300 shadow-sm">
                  <t.icon className="h-5 w-5" />
                </span>
                <span className="absolute bottom-3 left-4 pill shadow-sm">
                  {t.tag}
                </span>
              </div>

              <div className="p-6 pb-2">
                <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {t.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t.body}</p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {t.topics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-mono font-medium text-slate-700 dark:bg-white/5 dark:text-slate-300"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mx-6 mb-6 mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/10">
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                  <Clock className="h-3.5 w-3.5" /> {t.duration}
                </span>
                <span>•</span>
                <span>{t.level}</span>
              </div>
              <Link
                to="/register"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <span>Enroll Track</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function Earn() {
  return (
    <section id="earn" className="scroll-mt-28 px-4 py-20 bg-slate-100/50 dark:bg-[#090d15]/50">
      <SectionTitle
        eyebrow="Pillar 02 · Earn"
        title="Direct Pipelines to African & Global Tech Careers"
        body="Convert your skills into commercial income with direct employer placements, international remote contracts, and paid guild projects."
      />
      <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {EARN_PILLARS.map((p, i) => (
          <motion.div
            key={p.title}
            {...fadeUp}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="bento-card group p-6 flex flex-col justify-between hover:border-blue-500/50"
          >
            <div>
              <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30">
                <p.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-display text-base font-bold text-slate-900 dark:text-white">
                {p.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {p.body}
              </p>
            </div>
            <div className="mt-6 border-t border-slate-100 pt-3 dark:border-white/10">
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                {p.metric}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Grow() {
  const [cat, setCat] = useState<'All' | StartupCategory>('All');
  const shown = STARTUPS.filter((s) => cat === 'All' || s.category === cat);
  return (
    <section id="grow" className="scroll-mt-28 px-4 py-20">
      <SectionTitle
        eyebrow="Pillar 03 · Grow"
        title="Built inside L.E.G.I.T Hub"
        body="High-growth technology companies growing inside our incubation cohorts, backed by mentors, investor readiness, and $5M+ funding raised."
      />
      <div className="mb-8 flex justify-center">
        <Tabs
          value={cat}
          onChange={setCat}
          options={(['All', 'FinTech', 'HealthTech', 'EdTech', 'AgriTech'] as const).map((v) => ({ value: v, label: v }))}
        />
      </div>
      <motion.div layout className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((s) => (
            <motion.article
              key={s.name}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bento-card p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 border border-blue-500/20 font-display text-lg font-bold text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400">
                    {s.name[0]}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">{s.name}</h3>
                    <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">{s.stage}</p>
                  </div>
                </div>
                <span className="pill">{s.category}</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{s.body}</p>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}

function Technology() {
  return (
    <section className="px-4 py-20 bg-slate-100/50 dark:bg-[#090d15]/50">
      <SectionTitle
        eyebrow="Pillar 04 · Technology"
        title="Deep-Tech Labs & Infrastructure that Never Blinks"
        body="Access to high-performance workstations, hardware prototyping benches, sound-treated media studios, and 24/7 solar + grid power."
      />

      {/* Specialized Innovation Disciplines */}
      <div id="innovate" className="mx-auto max-w-6xl scroll-mt-28">
        <h3 className="mb-6 text-center font-display text-xl font-bold text-slate-900 dark:text-white">
          Specialized Innovation Disciplines
        </h3>
        <div className="grid gap-6 md:grid-cols-3">
          {DISCIPLINES.map((d, i) => (
            <motion.div
              key={d.title}
              {...fadeUp}
              transition={{ delay: i * 0.1 }}
              className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 group shadow-lg dark:shadow-xl bg-white dark:bg-[#0d111a]"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={d.image}
                  alt={d.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 brightness-[0.75] contrast-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0d111a] via-white/40 dark:via-[#0d111a]/50 to-transparent" />
                <span className="absolute top-4 right-4 rounded-full bg-white/90 border border-slate-200 p-2 text-blue-600 backdrop-blur-md dark:bg-blue-500/20 dark:border-blue-400/30 dark:text-blue-300">
                  <d.icon className="h-5 w-5" />
                </span>
              </div>
              <div className="p-6 bg-white dark:bg-[#0d111a]">
                <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {d.title}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{d.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 4 Facility Cards */}
      <div id="technology" className="mx-auto mt-16 max-w-6xl scroll-mt-28">
        <h3 className="mb-6 text-center font-display text-xl font-bold text-slate-900 dark:text-white">
          Core Hub Facilities & Redundancy
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FACILITIES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp}
              transition={{ delay: i * 0.08 }}
              className="bento-card overflow-hidden p-0 group bg-white dark:bg-[#0d111a]"
            >
              <div className="relative h-28 overflow-hidden">
                <img
                  src={f.image}
                  alt={f.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 brightness-[0.75]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0d111a] via-white/40 dark:via-[#0d111a]/40 to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-xl bg-white/90 border border-slate-200 p-2 text-blue-600 backdrop-blur-md dark:bg-blue-500/20 dark:border-blue-400/30 dark:text-blue-300">
                  <f.icon className="h-4 w-4" />
                </span>
              </div>
              <div className="p-5 bg-white dark:bg-[#0d111a]">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {f.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{f.body}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 active:scale-[0.98]"
          >
            <span>Book a space or workspace desk</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="px-4 py-20">
      <SectionTitle eyebrow="Founder Stories" title="What builders say" />
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        {TESTIMONIALS.map((t) => (
          <motion.figure key={t.name} {...fadeUp} className="bento-card p-8 flex flex-col justify-between">
            <div>
              <Quote className="h-8 w-8 text-blue-500/60 dark:text-blue-400/60" />
              <blockquote className="mt-4 text-base leading-relaxed text-slate-700 dark:text-slate-200">
                “{t.quote}”
              </blockquote>
            </div>
            <figcaption className="mt-6 flex items-center gap-3.5 border-t border-slate-200/60 pt-5 dark:border-white/10">
              <img
                src={t.avatar}
                alt={t.name}
                className="h-12 w-12 rounded-full object-cover border-2 border-blue-500/30 shadow-sm"
              />
              <div>
                <span className="block font-display font-bold text-slate-900 dark:text-white">{t.name}</span>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t.role}</span>
              </div>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="px-4 py-20">
      <SectionTitle eyebrow="FAQ" title="Frequently answered questions" />
      <div className="mx-auto max-w-3xl space-y-3">
        {FAQS.map((f, i) => (
          <div key={f.q} className="bento-card overflow-hidden p-0">
            <button
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-semibold text-slate-900 transition hover:text-cyan-600 dark:text-white dark:hover:text-cyan-300 cursor-pointer"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
            >
              <span>{f.q}</span>
              <ChevronDown className={cn('h-5 w-5 shrink-0 text-cyan-400 transition-transform duration-200', open === i && 'rotate-180')} />
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400 border-t border-slate-100 pt-3 dark:border-white/10">
                    {f.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}

function Insights() {
  return (
    <section className="px-4 py-20">
      <SectionTitle eyebrow="Ecosystem Insights" title="From the Hub Journal" />
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        {POSTS.map((p, i) => (
          <motion.article
            key={p.title}
            {...fadeUp}
            transition={{ delay: i * 0.08 }}
            className="bento-card group overflow-hidden p-0 transition-all hover:-translate-y-1 bg-white dark:bg-[#0d111a]"
          >
            <div className="relative h-44 overflow-hidden">
              <img
                src={p.image}
                alt={p.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 brightness-[0.75]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0d111a] via-white/40 dark:via-transparent to-transparent" />
              <span className="absolute bottom-3 left-3 rounded-full bg-white/90 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-800 backdrop-blur-md dark:bg-blue-950/80 dark:border-blue-400/40 dark:text-blue-300">
                {p.tag}
              </span>
            </div>
            <div className="p-6 bg-white dark:bg-[#0d111a]">
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{p.date} · {p.read} read</p>
              <h3 className="mt-2.5 font-display text-lg font-bold leading-snug text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 transition-colors">
                {p.title}
              </h3>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [emailModal, setEmailModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);

  const HUB_PHONE_RAW = '+2348054764906';
  const HUB_PHONE_DISPLAY = '+234 (0) 805 476 4906';
  const WHATSAPP_URL = `https://wa.me/2348054764906?text=${encodeURIComponent('Hello L.E.G.I.T Innovation Hub, I would like to make an inquiry.')}`;

  const HUB_EMAIL = 'info@legitinnovationhub.com';
  const GMAIL_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(HUB_EMAIL)}`;
  const OUTLOOK_URL = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(HUB_EMAIL)}`;

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText(HUB_PHONE_RAW);
      setPhoneCopied(true);
      toast.success('Phone copied', `${HUB_PHONE_DISPLAY} copied to clipboard.`);
      setTimeout(() => setPhoneCopied(false), 2500);
    } catch {
      toast.info('Phone number', HUB_PHONE_DISPLAY);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(HUB_EMAIL);
      setCopied(true);
      toast.success('Email copied', `${HUB_EMAIL} copied to clipboard.`);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.info('Email address', HUB_EMAIL);
    }
  };

  async function subscribe(e: FormEvent) {
    e.preventDefault();
    setState('loading');
    try {
      const res = await api<{ alreadySubscribed: boolean }>('/public/newsletter', { body: { email } });
      setMessage(res.alreadySubscribed ? "You're already on the list." : 'Subscribed! Watch your inbox.');
      setState('done');
      setEmail('');
    } catch (err) {
      setMessage(errorMessage(err));
      setState('error');
    }
  }

  return (
    <footer className="border-t border-slate-200/80 px-4 pb-12 pt-16 bg-slate-100/70 text-slate-900 dark:border-white/10 dark:bg-[#05070a] dark:text-slate-100 transition-colors">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1.4fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Driving Nigeria's digital future — one innovator, one startup at a time.
          </p>
          <ul className="mt-6 space-y-3.5 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-cyan-400 shrink-0" />
                <a
                  href={`tel:${HUB_PHONE_RAW}`}
                  className="font-medium text-slate-700 transition hover:text-cyan-600 dark:text-slate-300 dark:hover:text-cyan-400 hover:underline cursor-pointer"
                  title="Click to open dial app"
                >
                  {HUB_PHONE_DISPLAY}
                </a>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <a
                  href={`tel:${HUB_PHONE_RAW}`}
                  className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2.5 py-0.5 font-semibold text-cyan-600 transition hover:bg-cyan-500/20 dark:text-cyan-400"
                  title="Open in phone/dial app"
                >
                  <Phone className="h-2.5 w-2.5" />
                  <span>Call</span>
                </a>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-semibold text-emerald-600 transition hover:bg-emerald-500/20 dark:text-emerald-400"
                  title="Chat on WhatsApp"
                >
                  <span>WhatsApp</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20 cursor-pointer"
                  title="Copy phone number"
                >
                  {phoneCopied ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                  <span>{phoneCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-cyan-400 shrink-0" />
                <button
                  type="button"
                  onClick={() => setEmailModal(true)}
                  className="font-medium text-slate-700 transition hover:text-cyan-600 dark:text-slate-300 dark:hover:text-cyan-400 hover:underline cursor-pointer"
                  title="Click to choose email option"
                >
                  {HUB_EMAIL}
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <a
                  href={GMAIL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2.5 py-0.5 font-semibold text-cyan-600 transition hover:bg-cyan-500/20 dark:text-cyan-400"
                  title="Open directly in Gmail"
                >
                  <span>Gmail</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20 cursor-pointer"
                  title="Copy email address"
                >
                  {copied ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>Ibadan, Nigeria</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display font-semibold text-slate-900 dark:text-white">Explore</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
            {NAV.map((n) => (
              <li key={n.label}>
                <a
                  href={n.href}
                  onClick={(e) => {
                    if (n.href.startsWith('#')) {
                      e.preventDefault();
                      const target = document.querySelector(n.href);
                      if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                        window.history.pushState(null, '', n.href);
                      }
                    }
                  }}
                  className="transition hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {n.label}
                </a>
              </li>
            ))}
            <li>
              <Link to="/login" className="transition hover:text-blue-600 dark:hover:text-blue-400">Member Terminal Login</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display font-semibold text-slate-900 dark:text-white">Stay in the loop</h4>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Monthly incubation updates, venture demo days, and developer workshops.
          </p>
          <form onSubmit={subscribe} className="mt-4 flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="field rounded-full"
              aria-label="Email address"
            />
            <Button loading={state === 'loading'}>Subscribe</Button>
          </form>
          {message && (
            <p className={cn('mt-2 flex items-center gap-1.5 text-sm', state === 'error' ? 'text-rose-400' : 'text-emerald-400')}>
              {state === 'done' && <CheckCircle2 className="h-4 w-4" />} {message}
            </p>
          )}
        </div>
      </div>

      <p className="mx-auto mt-12 max-w-6xl text-center text-xs text-slate-500">
        © {new Date().getFullYear()} L.E.G.I.T Innovation Hub. All rights reserved. Built with precision for African tech builders.
      </p>

      <Modal open={emailModal} onClose={() => setEmailModal(false)} title="Send us an Email">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Choose how you'd like to compose your message to <strong className="text-slate-900 dark:text-white">{HUB_EMAIL}</strong>:
          </p>

          <div className="grid gap-2.5">
            <a
              href={GMAIL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setEmailModal(false)}
              className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 font-semibold text-cyan-900 transition hover:bg-cyan-500/20 dark:text-cyan-200"
            >
              <span className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-cyan-400" />
                <span className="text-sm">Open in Gmail (Web Browser)</span>
              </span>
              <ExternalLink className="h-4 w-4 text-cyan-400" />
            </a>

            <a
              href={`mailto:${HUB_EMAIL}`}
              onClick={() => setEmailModal(false)}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 font-medium transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 text-slate-900 dark:text-white"
            >
              <span className="flex items-center gap-3">
                <Send className="h-5 w-5 text-slate-400" />
                <span className="text-sm">Open in Default Mail App (Outlook, Apple Mail)</span>
              </span>
              <ExternalLink className="h-4 w-4 text-slate-400" />
            </a>

            <a
              href={OUTLOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setEmailModal(false)}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 font-medium transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 text-slate-900 dark:text-white"
            >
              <span className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-sky-400" />
                <span className="text-sm">Open in Outlook Web</span>
              </span>
              <ExternalLink className="h-4 w-4 text-slate-400" />
            </a>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-100/70 p-3 dark:border-white/10 dark:bg-white/5">
            <span className="truncate font-mono text-xs text-slate-600 dark:text-slate-400">{HUB_EMAIL}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Address'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </footer>
  );
}

export default function Landing() {
  useEffect(() => {
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-[#07090e] dark:text-slate-100 transition-colors duration-200">
      <Header />
      <main>
        <Hero />
        <Metrics />
        <Learn />
        <Earn />
        <Grow />
        <Technology />
        <Testimonials />
        <Faq />
        <Insights />
      </main>
      <Footer />
    </div>
  );
}
