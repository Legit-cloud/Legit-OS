import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { animate, AnimatePresence, motion, useInView } from 'framer-motion';
import {
  ArrowRight, ChevronDown, Mail, MapPin, Menu, Phone, Quote, Sparkles, Terminal, X, ArrowUpRight, CheckCircle2,
} from 'lucide-react';
import { Button, Logo, Tabs, cn } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../store/auth';
import {
  DISCIPLINES, FACILITIES, FAQS, METRICS, NAV, POSTS, PROGRAMS, STARTUPS, TESTIMONIALS, type StartupCategory,
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
  const home = user ? (user.role === 'ADMIN' ? '/admin' : '/app') : '/register';
  return (
    <header className="fixed inset-x-0 top-4 z-40 px-4">
      <nav className="glass mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5 shadow-lg shadow-slate-900/5">
        <Link to="/" aria-label="L.E.G.I.T Innovation Hub home"><Logo /></Link>
        <div className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a key={n.label} href={n.href} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-cyan-500/10 hover:text-cyan-600 dark:text-slate-300 dark:hover:text-cyan-300">
              {n.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {!user && (
            <Link to="/login" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-slate-600 hover:text-cyan-600 sm:block dark:text-slate-300">
              Sign in
            </Link>
          )}
          <Link to={home} className="hidden sm:block">
            <Button size="sm" className="px-5 py-2 tracking-wide">{user ? 'OPEN TERMINAL' : 'JOIN THE HUB'}</Button>
          </Link>
          <button className="rounded-full p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
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
            className="glass mx-auto mt-2 flex max-w-6xl flex-col gap-1 bg-white/95 p-3 md:hidden dark:bg-slate-900/95"
          >
            {NAV.map((n) => (
              <a key={n.label} href={n.href} onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 font-medium hover:bg-cyan-500/10">
                {n.label}
              </a>
            ))}
            {!user && <Link to="/login" className="rounded-2xl px-4 py-3 font-medium hover:bg-cyan-500/10">Sign in</Link>}
            <Link to={home}><Button className="w-full">{user ? 'OPEN TERMINAL' : 'JOIN THE HUB'}</Button></Link>
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
  const pills = ['Startup Incubation', 'GPU Render Farm', 'Python Mastery', 'Pitch Night', '24/7 Power', 'Career Placement'];
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-36 sm:pt-44">
      <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="absolute left-1/2 top-24 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="pill"><Sparkles className="h-3.5 w-3.5" /> Ibadan's home for builders</span>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Driving Nigeria's <span className="gradient-text">Digital Future</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-600 dark:text-slate-300">
            Empowering innovators, scaling tech startups. Learn in-demand skills, earn from your craft and grow with a community of 550+ builders.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register"><Button size="lg">Join the Hub <ArrowRight className="h-5 w-5" /></Button></Link>
            <a href="#programs"><Button size="lg" variant="outline">Explore programs</Button></a>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.15 }} className="relative">
          <div className="glass overflow-hidden bg-slate-950/90 p-0 text-slate-100 dark:bg-slate-950/80">
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
              <span className="h-3 w-3 rounded-full bg-rose-400" /><span className="h-3 w-3 rounded-full bg-amber-400" /><span className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-3 flex items-center gap-1.5 font-mono text-xs text-slate-400"><Terminal className="h-3.5 w-3.5" /> legit-os ~ status</span>
            </div>
            <div className="space-y-2 p-5 font-mono text-sm">
              <p><span className="text-cyan-400">$</span> hub status --live</p>
              <p className="text-emerald-400">● SYSTEM ONLINE · Ibadan, NG · WAT</p>
              <p className="text-slate-400">power ........ <span className="text-slate-100">grid + solar (100%)</span></p>
              <p className="text-slate-400">fibre ........ <span className="text-slate-100">100 Mbps · 4ms</span></p>
              <p className="text-slate-400">desks ........ <span className="text-slate-100">42 / 60 occupied</span></p>
              <p className="text-slate-400">gpu farm ..... <span className="text-slate-100">8× RTX nodes ready</span></p>
              <p><span className="text-cyan-400">$</span> <span className="animate-pulse">▍</span></p>
            </div>
          </div>
          {pills.map((p, i) => (
            <motion.span
              key={p}
              className={cn('pill absolute hidden bg-white/90 shadow-lg backdrop-blur sm:inline-flex dark:bg-slate-900/90', [
                '-left-8 -top-5', '-right-4 top-10', '-left-12 top-1/2', '-right-10 bottom-16', 'left-10 -bottom-5', 'right-1/3 -top-8',
              ][i])}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
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
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {METRICS.map((m, i) => (
          <motion.div key={m.label} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }} className="glass p-5 text-center">
            <p className="font-display text-3xl font-bold text-cyan-600 dark:text-cyan-400"><Counter {...m} /></p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{m.label}</p>
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
      <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {body && <p className="mt-3 text-slate-600 dark:text-slate-400">{body}</p>}
    </motion.div>
  );
}

function Programs() {
  return (
    <section id="programs" className="scroll-mt-28 px-4 py-20">
      <SectionTitle eyebrow="The Ecosystem" title="Everything a builder needs, under one roof" body="Six programs designed to take you from first line of code to funded company." />
      <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROGRAMS.map((p, i) => (
          <motion.article key={p.title} id={p.id} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.06 }} className="glass group scroll-mt-28 p-6 transition hover:-translate-y-1 hover:border-cyan-500/40">
            <div className="flex items-center justify-between">
              <span className="rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-3 text-white shadow-lg shadow-cyan-500/20"><p.icon className="h-6 w-6" /></span>
              <span className="pill">{p.tag}</span>
            </div>
            <h3 className="mt-5 font-display text-xl font-bold">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{p.body}</p>
          </motion.article>
        ))}
      </div>

      <div className="mx-auto mt-16 max-w-6xl">
        <h3 className="mb-6 text-center font-display text-2xl font-bold">Disciplines</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {DISCIPLINES.map((d) => (
            <motion.div key={d.title} {...fadeUp} className="glass relative overflow-hidden p-6">
              <d.icon className="absolute -right-4 -top-4 h-28 w-28 text-cyan-500/10" />
              <d.icon className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />
              <h4 className="mt-4 font-display text-lg font-bold">{d.title}</h4>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{d.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Startups() {
  const [cat, setCat] = useState<'All' | StartupCategory>('All');
  const shown = STARTUPS.filter((s) => cat === 'All' || s.category === cat);
  return (
    <section className="px-4 py-20">
      <SectionTitle eyebrow="Startup Directory" title="Built at L.E.G.I.T" body="A few of the companies growing inside our walls." />
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
            <motion.article key={s.name} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 font-display text-lg font-bold text-cyan-400 dark:bg-white/10">{s.name[0]}</span>
                  <div>
                    <h3 className="font-display text-lg font-bold">{s.name}</h3>
                    <p className="text-xs text-slate-500">{s.stage}</p>
                  </div>
                </div>
                <span className="pill">{s.category}</span>
              </div>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{s.body}</p>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}

function Infrastructure() {
  return (
    <section className="px-4 py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
        <motion.div {...fadeUp}>
          <span className="pill">Infrastructure & Facilities</span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">Infrastructure that never blinks.</h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400">
            Coworking desks, private offices, a media studio, conference rooms and classrooms — all bookable by the hour from your L.E.G.I.T OS terminal.
          </p>
          <Link to="/register" className="mt-6 inline-flex items-center gap-1 font-semibold text-cyan-600 hover:underline dark:text-cyan-400">
            Book a space <ArrowUpRight className="h-4 w-4" />
          </Link>
        </motion.div>
        <div className="grid gap-4 sm:grid-cols-2">
          {FACILITIES.map((f, i) => (
            <motion.div key={f.title} {...fadeUp} transition={{ delay: i * 0.08 }} className="glass p-6">
              <f.icon className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />
              <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="px-4 py-20">
      <SectionTitle eyebrow="Founders" title="What founders say" />
      <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
        {TESTIMONIALS.map((t) => (
          <motion.figure key={t.name} {...fadeUp} className="glass p-7">
            <Quote className="h-8 w-8 text-cyan-500" />
            <blockquote className="mt-4 text-lg leading-relaxed">“{t.quote}”</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 font-bold text-white">
                {t.name.split(' ').map((p) => p[0]).join('')}
              </span>
              <span>
                <span className="block font-semibold">{t.name}</span>
                <span className="text-sm text-slate-500">{t.role}</span>
              </span>
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
      <SectionTitle eyebrow="FAQ" title="Questions, answered" />
      <div className="mx-auto max-w-3xl space-y-3">
        {FAQS.map((f, i) => (
          <div key={f.q} className="glass overflow-hidden p-0">
            <button className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-semibold" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              {f.q}
              <ChevronDown className={cn('h-5 w-5 shrink-0 text-cyan-500 transition', open === i && 'rotate-180')} />
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <p className="px-6 pb-5 text-slate-600 dark:text-slate-400">{f.a}</p>
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
      <SectionTitle eyebrow="Ecosystem Insights" title="From the hub journal" />
      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
        {POSTS.map((p, i) => (
          <motion.article key={p.title} {...fadeUp} transition={{ delay: i * 0.08 }} className="glass group overflow-hidden p-0">
            <div className="relative h-40 overflow-hidden bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-800">
              <div className="grid-bg absolute inset-0 opacity-40" />
              <span className="absolute bottom-4 left-4 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{p.tag}</span>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-500">{p.date} · {p.read} read</p>
              <h3 className="mt-2 font-display text-lg font-bold leading-snug group-hover:text-cyan-600 dark:group-hover:text-cyan-400">{p.title}</h3>
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
    <footer className="border-t border-slate-200 px-4 pb-10 pt-16 dark:border-white/10">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1.4fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-slate-600 dark:text-slate-400">Driving Nigeria's digital future — one innovator, one startup at a time.</p>
          <ul className="mt-6 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-cyan-500" /> +234 (0) 800 123 4567</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-cyan-500" /> <a href="mailto:hello@legithub.com" className="hover:text-cyan-600">hello@legithub.com</a></li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-cyan-500" /> Ibadan, Nigeria</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold">Explore</h4>
          <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            {NAV.map((n) => <li key={n.label}><a href={n.href} className="hover:text-cyan-600">{n.label}</a></li>)}
            <li><Link to="/login" className="hover:text-cyan-600">Member sign in</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold">Stay in the loop</h4>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Monthly ecosystem news, events and opportunities.</p>
          <form onSubmit={subscribe} className="mt-4 flex gap-2">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="field rounded-full" aria-label="Email address" />
            <Button loading={state === 'loading'}>Subscribe</Button>
          </form>
          {message && (
            <p className={cn('mt-2 flex items-center gap-1.5 text-sm', state === 'error' ? 'text-rose-500' : 'text-emerald-600')}>
              {state === 'done' && <CheckCircle2 className="h-4 w-4" />} {message}
            </p>
          )}
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-6xl text-center text-xs text-slate-500">© {new Date().getFullYear()} L.E.G.I.T Innovation Hub. All rights reserved.</p>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Header />
      <main>
        <Hero />
        <Metrics />
        <Programs />
        <Startups />
        <Infrastructure />
        <Testimonials />
        <Faq />
        <Insights />
      </main>
      <Footer />
    </div>
  );
}
