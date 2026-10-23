import {
  Rocket, GraduationCap, Building2, Briefcase, Globe2, FlaskConical, Cpu, Wrench, Clapperboard,
  Zap, Wifi, Fingerprint, Server, Code2, ShieldCheck, Terminal, Award, DollarSign, TrendingUp, Users,
  type LucideIcon,
} from 'lucide-react';

export const NAV = [
  { label: 'Learn', href: '#learn' },
  { label: 'Earn', href: '#earn' },
  { label: 'Grow', href: '#grow' },
  { label: 'Innovate', href: '#innovate' },
  { label: 'Technology', href: '#technology' },
];

export const METRICS: { value: number; prefix?: string; suffix: string; label: string }[] = [
  { value: 550, suffix: '+', label: 'Innovators Trained' },
  { value: 250, suffix: '+', label: 'Startups Funded' },
  { value: 220, suffix: '+', label: 'Active Innovators' },
  { value: 30, suffix: '+', label: 'Incubated' },
  { value: 100, suffix: '+', label: 'Global Partners' },
  { value: 5, prefix: '$', suffix: 'M+', label: 'Funding Raised' },
  { value: 5, suffix: '+', label: 'Years Excellence' },
];

export const LEARN_TRACKS = [
  {
    icon: Code2,
    title: 'Full-Stack Software Engineering',
    tag: 'Web & Cloud',
    duration: '16 Weeks',
    level: 'Beginner to Advanced',
    topics: ['TypeScript', 'React 19', 'Node.js', 'PostgreSQL', 'Docker'],
    body: 'Master modern frontend, scalable backend architectures, and production cloud deployments from day one.',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Terminal,
    title: 'Python, Data Science & AI/ML',
    tag: 'AI Engineering',
    duration: '14 Weeks',
    level: 'Intermediate',
    topics: ['Python 3.12', 'Pandas & NumPy', 'PyTorch', 'FastAPI', 'LLM Workflows'],
    body: 'Build predictive AI pipelines, machine learning models, and production-ready intelligent services.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: ShieldCheck,
    title: 'Cybersecurity & Ethical Defense',
    tag: 'SecOps',
    duration: '12 Weeks',
    level: 'All Levels',
    topics: ['Network Defense', 'Penetration Testing', 'SIEM / SOC', 'Auditing'],
    body: 'Hands-on offensive and defensive cybersecurity lab training to safeguard high-stakes infrastructure.',
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Award,
    title: 'Product Leadership & UI/UX Design',
    tag: 'Design & Ops',
    duration: '10 Weeks',
    level: 'All Levels',
    topics: ['User Research', 'Figma Systems', 'Prototyping', 'Product Strategy'],
    body: 'Craft high-converting interfaces, establish design systems, and run agile product development teams.',
    image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80',
  },
];

export const EARN_PILLARS = [
  {
    icon: Briefcase,
    title: 'Direct Partner Hiring Pipelines',
    metric: '100+ Hiring Partners',
    body: 'Direct interview fast-tracks and introductions to vetted technology companies across Nigeria and globally.',
  },
  {
    icon: DollarSign,
    title: 'Global Remote Engineering Roles',
    metric: '$1.2M+ Earned by Alumni',
    body: 'Access curated international remote jobs, vetted client contracts, and global competitive compensation packages.',
  },
  {
    icon: TrendingUp,
    title: 'Portfolio & Technical Interview Prep',
    metric: '94% Placement Rate',
    body: 'Whiteboard sessions, live system-design reviews, resume polish, and Github portfolio critiques by senior leads.',
  },
  {
    icon: Users,
    title: 'Freelance & Commercial Guild',
    metric: 'Paid Client Sprints',
    body: 'Join the internal L.E.G.I.T agency guild. Earn while collaborating on live client production engagements.',
  },
];

export const PROGRAMS: { id?: string; icon: LucideIcon; title: string; tag: string; body: string }[] = [
  { icon: Rocket, title: 'Startup Incubation', tag: 'Build', body: 'A 6-month track with mentors, investor readiness, legal support and demo-day exposure for early-stage founders.' },
  { id: 'learn', icon: GraduationCap, title: 'Tech Education', tag: 'Learn', body: 'Cohort-based academy courses in full-stack development, cybersecurity, Python, video editing and product management.' },
  { icon: Building2, title: 'Elite Infrastructure', tag: 'Work', body: 'Coworking desks, private offices, media studio and conference rooms with uninterrupted power and fibre.' },
  { id: 'earn', icon: Briefcase, title: 'Career Placement', tag: 'Earn', body: 'Portfolio reviews, interview prep and direct placement with partner companies hiring African tech talent.' },
  { id: 'grow', icon: Globe2, title: 'Global Networking', tag: 'Grow', body: 'Pitch nights, founder dinners and a 100+ partner network spanning investors, corporates and governments.' },
  { id: 'technology', icon: FlaskConical, title: 'Innovation Labs', tag: 'Tech', body: 'Access to hardware prototyping, GPU compute and R&D sprints for teams building deep-tech products.' },
];

export const DISCIPLINES: { icon: LucideIcon; title: string; body: string; image: string }[] = [
  {
    icon: Cpu,
    title: 'High-Performance Computing',
    body: 'GPU render farm and dedicated workstations for AI training, simulation and 3D rendering.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
  },
  {
    icon: Wrench,
    title: 'Hardware & Prototyping Labs',
    body: '3D printers, electronics benches and IoT kits to take products from sketch to working prototype.',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
  },
  {
    icon: Clapperboard,
    title: 'Creative Studios & Audio',
    body: 'Sound-treated media studio with cameras, lighting and podcast rigs for creators and brands.',
    image: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
  },
];

export type StartupCategory = 'FinTech' | 'HealthTech' | 'EdTech' | 'AgriTech';
export const STARTUPS: { name: string; category: StartupCategory; stage: string; body: string }[] = [
  { name: 'PayFlow Africa', category: 'FinTech', stage: 'Seed', body: 'Cross-border payment rails for SMEs trading across West Africa.' },
  { name: 'MediSync Systems', category: 'HealthTech', stage: 'Pre-Series A', body: 'Interoperable patient records connecting clinics and pharmacies.' },
  { name: 'LearnSphere', category: 'EdTech', stage: 'Seed', body: 'Adaptive learning platform for secondary-school STEM students.' },
  { name: 'KudiVault', category: 'FinTech', stage: 'Pre-Seed', body: 'Micro-savings and cooperative wallets for informal traders.' },
  { name: 'AgroDrone NG', category: 'AgriTech', stage: 'Seed', body: 'Drone-based crop monitoring and precision spraying for farms.' },
  { name: 'CodeCamp Ibadan', category: 'EdTech', stage: 'Bootstrapped', body: 'Weekend coding bootcamps for teenagers across Oyo State.' },
];

export const FACILITIES: { icon: LucideIcon; title: string; body: string; image: string }[] = [
  {
    icon: Zap,
    title: '24/7 Redundant Power',
    body: 'Triple grid redundancy: national grid, industrial solar microgrid, and diesel generator backup — zero downtime.',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Wifi,
    title: '100Mbps Dedicated Fibre',
    body: 'Dual-homed low-latency fibre pipelines with sub-5ms ping to major cloud regions for seamless deploys and streaming.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Fingerprint,
    title: 'Biometric Access Control',
    body: 'Secure 24/7 smart entry with biometric badge verification, private lockers, and round-the-clock physical security.',
    image: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Server,
    title: 'GPU Compute & Workstations',
    body: '8× RTX nodes ready on-demand for deep learning training, Blender 3D rendering, and simulation workloads.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
  },
];

export const TESTIMONIALS = [
  {
    name: 'Sophia Reynolds',
    role: 'Founder & CEO, PayFlow Africa',
    quote: 'The incubation program gave us mentors who had actually scaled payment companies. We closed our seed round three months after demo day.',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Daniel Okafor',
    role: 'CTO, AgroDrone NG',
    quote: 'Reliable power, fast fibre and a hardware lab next door. L.E.G.I.T is the only place in Ibadan where we could prototype and ship at the same time.',
    avatar: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=300&q=80',
  },
];

export const FAQS = [
  {
    q: 'How do I apply for the incubation program?',
    a: 'Create a free hub account, then apply from the Hub Programs section of your terminal. Cohorts open twice a year; shortlisted founders are invited to a pitch interview.',
  },
  {
    q: 'What does a coworking membership include?',
    a: 'Pay-As-You-Go members book desks hourly or by day pass. Pro members (₦60,000/month) get priority desk access, discounted facility rates, lounge perks and member events.',
  },
  {
    q: 'Does L.E.G.I.T take equity in incubated startups?',
    a: 'Our core incubation track is equity-free. Startups that join our accelerator investment track may receive funding in exchange for a small, founder-friendly equity stake agreed upfront.',
  },
  {
    q: 'Can I pay for courses in installments?',
    a: 'Yes. Every academy course can be paid in full or in two 50% installments. Classroom access unlocks as soon as your first installment is verified.',
  },
  {
    q: 'How do I pay?',
    a: 'Transfer to the hub account shown in your Finance page and upload the receipt. An admin verifies it and your booking, course or plan unlocks automatically.',
  },
];

export const POSTS = [
  {
    tag: 'Ecosystem',
    title: "Why Ibadan is becoming Nigeria's next tech corridor",
    date: 'Sep 2026',
    read: '6 min',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
  },
  {
    tag: 'Founders',
    title: 'From hackathon to seed round: the KudiVault story',
    date: 'Aug 2026',
    read: '4 min',
    image: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=800&q=80',
  },
  {
    tag: 'Engineering',
    title: 'The 2026 roadmap for becoming a high-impact developer',
    date: 'Jul 2026',
    read: '8 min',
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
  },
];
