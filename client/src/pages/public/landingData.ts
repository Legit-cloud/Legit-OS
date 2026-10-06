import {
  Rocket, GraduationCap, Building2, Briefcase, Globe2, FlaskConical, Cpu, Wrench, Clapperboard,
  Zap, Wifi, Fingerprint, Server, type LucideIcon,
} from 'lucide-react';

export const NAV = [
  { label: 'Learn', href: '#learn' },
  { label: 'Earn', href: '#earn' },
  { label: 'Grow', href: '#grow' },
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

export const PROGRAMS: { id?: string; icon: LucideIcon; title: string; tag: string; body: string }[] = [
  { icon: Rocket, title: 'Startup Incubation', tag: 'Build', body: 'A 6-month track with mentors, investor readiness, legal support and demo-day exposure for early-stage founders.' },
  { id: 'learn', icon: GraduationCap, title: 'Tech Education', tag: 'Learn', body: 'Cohort-based academy courses in full-stack development, cybersecurity, Python, video editing and product management.' },
  { icon: Building2, title: 'Elite Infrastructure', tag: 'Work', body: 'Coworking desks, private offices, media studio and conference rooms with uninterrupted power and fibre.' },
  { id: 'earn', icon: Briefcase, title: 'Career Placement', tag: 'Earn', body: 'Portfolio reviews, interview prep and direct placement with partner companies hiring African tech talent.' },
  { id: 'grow', icon: Globe2, title: 'Global Networking', tag: 'Grow', body: 'Pitch nights, founder dinners and a 100+ partner network spanning investors, corporates and governments.' },
  { id: 'technology', icon: FlaskConical, title: 'Innovation Labs', tag: 'Tech', body: 'Access to hardware prototyping, GPU compute and R&D sprints for teams building deep-tech products.' },
];

export const DISCIPLINES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Cpu, title: 'High-Performance Computing', body: 'GPU render farm and dedicated workstations for AI training, simulation and 3D rendering.' },
  { icon: Wrench, title: 'Hardware & Prototyping Labs', body: '3D printers, electronics benches and IoT kits to take products from sketch to working prototype.' },
  { icon: Clapperboard, title: 'Creative Studios & Audio', body: 'Sound-treated media studio with cameras, lighting and podcast rigs for creators and brands.' },
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

export const FACILITIES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Zap, title: '24/7 Power', body: 'Grid, solar and generator redundancy — your build never stops.' },
  { icon: Wifi, title: '100Mbps Fibre', body: 'Dedicated fibre with failover so calls and deploys stay smooth.' },
  { icon: Fingerprint, title: 'Biometric Security', body: 'Biometric access control and CCTV across every floor.' },
  { icon: Server, title: 'GPU Render Farm', body: 'On-demand GPU compute for AI, rendering and research workloads.' },
];

export const TESTIMONIALS = [
  {
    name: 'Sophia Reynolds',
    role: 'Founder, PayFlow Africa',
    quote: 'The incubation program gave us mentors who had actually scaled payment companies. We closed our seed round three months after demo day.',
  },
  {
    name: 'Daniel Okafor',
    role: 'CTO, AgroDrone NG',
    quote: 'Reliable power, fast fibre and a hardware lab next door. L.E.G.I.T is the only place in Ibadan where we could prototype and ship at the same time.',
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
  { tag: 'Ecosystem', title: "Why Ibadan is becoming Nigeria's next tech corridor", date: 'Sep 2026', read: '6 min' },
  { tag: 'Founders', title: 'From hackathon to seed round: the KudiVault story', date: 'Aug 2026', read: '4 min' },
  { tag: 'Learn', title: 'The 2026 roadmap for becoming a full-stack developer', date: 'Jul 2026', read: '8 min' },
];
