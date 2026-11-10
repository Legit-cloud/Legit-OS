export interface LessonResource {
  id: string;
  title: string;
  url: string;
  type: 'GITHUB' | 'SLIDES' | 'DOCS' | 'DOWNLOAD';
}

export interface Lesson {
  id: string;
  title: string;
  durationMinutes: number;
  videoUrl?: string;
  summary: string;
  keyPoints?: string[];
  resources: LessonResource[];
}

export interface CourseModule {
  id: string;
  week: number;
  title: string;
  description: string;
  lessons: Lesson[];
}

export const sampleCurriculums: Record<string, CourseModule[]> = {
  'full-stack-web': [
    {
      id: 'fsw-mod-1',
      week: 1,
      title: 'HTML, CSS & Modern Layouts',
      description: 'Master modern semantic markup, responsive design principles, CSS Flexbox, and Grid systems.',
      lessons: [
        {
          id: 'fsw-1-1',
          title: 'Semantic HTML5 & Accessible DOM Structure',
          durationMinutes: 28,
          videoUrl: 'https://www.youtube.com/watch?v=kUMe1FH4CHE',
          summary: 'Explore why semantic HTML is foundational for SEO, accessibility screen readers, and modern browser rendering optimizations.',
          keyPoints: [
            'Differentiating sections, articles, navs, and asides',
            'ARIA labels and assistive technology best practices',
            'Page hierarchy with single h1 rules',
          ],
          resources: [
            { id: 'fsw-res-1', title: 'HTML5 Semantic Cheat Sheet', url: 'https://developer.mozilla.org/en-US/docs/Glossary/Semantics', type: 'DOCS' },
            { id: 'fsw-res-2', title: 'Week 1 Starter Codebase', url: 'https://github.com', type: 'GITHUB' },
          ],
        },
        {
          id: 'fsw-1-2',
          title: 'CSS Flexbox & CSS Grid Mastery',
          durationMinutes: 42,
          videoUrl: 'https://www.youtube.com/watch?v=JJSoEo8JSnc',
          summary: 'Build complex, bulletproof two-dimensional responsive layouts without breaking on mobile screens.',
          keyPoints: [
            'Flexbox container vs items alignment (justify-content, align-items)',
            'CSS Grid template areas and auto-fit minmax patterns',
            'Mobile-first responsive media queries',
          ],
          resources: [
            { id: 'fsw-res-3', title: 'CSS Grid Guide & Diagrams', url: 'https://css-tricks.com/snippets/css/complete-guide-grid/', type: 'DOCS' },
            { id: 'fsw-res-4', title: 'Flexbox Froggy Game Lab', url: 'https://flexboxfroggy.com/', type: 'DOWNLOAD' },
          ],
        },
        {
          id: 'fsw-1-3',
          title: 'Design Tokens, CSS Variables & Glassmorphism',
          durationMinutes: 35,
          videoUrl: 'https://www.youtube.com/watch?v=sQuzUvM26qE',
          summary: 'Learn how to build sleek dark-mode glassmorphic user interfaces using custom CSS properties and backdrop filters.',
          keyPoints: [
            'Defining semantic color tokens using HSL & CSS variables',
            'Backdrop-filter blur and frosted glass surfaces',
            'Consistent spacing scales and micro-interactions',
          ],
          resources: [
            { id: 'fsw-res-5', title: 'L.E.G.I.T Hub UI Design System Tokens', url: 'https://github.com', type: 'GITHUB' },
          ],
        },
      ],
    },
    {
      id: 'fsw-mod-2',
      week: 2,
      title: 'JavaScript Deep Dive & ESNext',
      description: 'Deep dive into asynchronous JavaScript, Event Loop, closures, and modern ES6+ functional programming.',
      lessons: [
        {
          id: 'fsw-2-1',
          title: 'The JavaScript Event Loop, Call Stack & Microtasks',
          durationMinutes: 38,
          videoUrl: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ',
          summary: 'Understand exactly how single-threaded V8 executes your asynchronous code under the hood.',
          keyPoints: [
            'Call stack vs Callback Queue vs Microtask queue (Promises)',
            'Preventing main-thread blocking bottlenecks',
            'Timers and macrotask execution timing',
          ],
          resources: [
            { id: 'fsw-res-6', title: 'Event Loop Visualizer Tool', url: 'https://latentflip.com/loupe/', type: 'DOCS' },
          ],
        },
        {
          id: 'fsw-2-2',
          title: 'Async/Await, Promises & Error Handling',
          durationMinutes: 45,
          videoUrl: 'https://www.youtube.com/watch?v=V_Kr9OSfDeU',
          summary: 'Master clean asynchronous workflows with async/await, Promise.allSettled, and graceful error boundary patterns.',
          keyPoints: [
            'Refactoring callback hell and raw Promises into async/await',
            'Parallel asynchronous execution with Promise.all and race conditions',
            'Robust try/catch patterns and custom Error classes',
          ],
          resources: [
            { id: 'fsw-res-7', title: 'Async Patterns Lab', url: 'https://github.com', type: 'GITHUB' },
          ],
        },
      ],
    },
    {
      id: 'fsw-mod-3',
      week: 3,
      title: 'React Fundamentals & Component Architecture',
      description: 'Build fast, declarative user interfaces with modern React, Hooks, and component decomposition.',
      lessons: [
        {
          id: 'fsw-3-1',
          title: 'JSX, Props & The Component Lifecycle',
          durationMinutes: 40,
          videoUrl: 'https://www.youtube.com/watch?v=SqcY0GlETPk',
          summary: 'The building blocks of modern React: purity, declarative UI rendering, and props drilling solutions.',
          keyPoints: [
            'JSX transformation and React element trees',
            'Immutable state updates vs direct mutations',
            'Component decomposition and reusability',
          ],
          resources: [
            { id: 'fsw-res-8', title: 'Official React Documentation', url: 'https://react.dev', type: 'DOCS' },
          ],
        },
        {
          id: 'fsw-3-2',
          title: 'Deep Dive: useState, useEffect & Custom Hooks',
          durationMinutes: 52,
          videoUrl: 'https://www.youtube.com/watch?v=0ZJgIjIuY7U',
          summary: 'Eliminate infinite re-render loops and master hook dependencies, cleanups, and custom abstraction hooks.',
          keyPoints: [
            'Hook rules and fiber reconciliation',
            'Effect dependency arrays and unmount cleanup functions',
            'Authoring reusable custom hooks for API fetching and storage',
          ],
          resources: [
            { id: 'fsw-res-9', title: 'Custom Hooks Starter Library', url: 'https://github.com', type: 'GITHUB' },
          ],
        },
      ],
    },
    {
      id: 'fsw-mod-4',
      week: 4,
      title: 'State & Data Fetching with TanStack Query',
      description: 'Server state vs client state, cache invalidation, and seamless optimistic UI updates.',
      lessons: [
        {
          id: 'fsw-4-1',
          title: 'Server State Management with React Query',
          durationMinutes: 44,
          videoUrl: 'https://www.youtube.com/watch?v=novnyCaa7To',
          summary: 'Why useEffect is bad for data fetching and how TanStack Query handles caching, background refetching, and deduping.',
          keyPoints: [
            'Stale-while-revalidate caching paradigm',
            'Query keys hierarchy and invalidation triggers',
            'Optimistic updates and automatic rollback',
          ],
          resources: [
            { id: 'fsw-res-10', title: 'TanStack Query Quickstart', url: 'https://tanstack.com/query/latest', type: 'DOCS' },
          ],
        },
      ],
    },
    {
      id: 'fsw-mod-5',
      week: 5,
      title: 'Node.js & Express APIs',
      description: 'Design and build resilient, production-grade RESTful APIs with Node.js, Express, and validation middlewares.',
      lessons: [
        {
          id: 'fsw-5-1',
          title: 'Express Routing, Middleware Pipelines & Zod Validation',
          durationMinutes: 50,
          videoUrl: 'https://www.youtube.com/watch?v=Oe421EPjeBE',
          summary: 'Architecting an Express backend: middleware request chains, rate limiting, and runtime request body validation with Zod.',
          keyPoints: [
            'Middleware pipeline order of execution',
            'Validating schemas with Zod before controllers',
            'Centralized error handler middleware',
          ],
          resources: [
            { id: 'fsw-res-11', title: 'Express API Architecture Boilerplate', url: 'https://github.com', type: 'GITHUB' },
          ],
        },
      ],
    },
    {
      id: 'fsw-mod-6',
      week: 6,
      title: 'Databases with Prisma ORM',
      description: 'Schema modeling, migrations, relations, and high-performance SQL query optimization with Prisma.',
      lessons: [
        {
          id: 'fsw-6-1',
          title: 'Data Modeling, Relational Foreign Keys & Migrations',
          durationMinutes: 46,
          videoUrl: 'https://www.youtube.com/watch?v=RebA5J-rlhU',
          summary: 'From conceptual entity relationship diagrams to Prisma schema definitions, migrations, and compound indexes.',
          keyPoints: [
            'One-to-many and many-to-many relationship declarations',
            'Prisma client queries, pagination, and relation includes',
            'Database indexing for sub-10ms lookup times',
          ],
          resources: [
            { id: 'fsw-res-12', title: 'Prisma Schema Guide', url: 'https://www.prisma.io/docs', type: 'DOCS' },
          ],
        },
      ],
    },
    {
      id: 'fsw-mod-7',
      week: 7,
      title: 'Authentication, JWT & Security Hardening',
      description: 'Session management, JWT tokens, password hashing with Argon2/Bcrypt, and defense against OWASP vulnerabilities.',
      lessons: [
        {
          id: 'fsw-7-1',
          title: 'Stateless JWT Auth, Refresh Tokens & RBAC',
          durationMinutes: 48,
          videoUrl: 'https://www.youtube.com/watch?v=mbsmsi7l3r4',
          summary: 'How to implement enterprise security: password hashing, bearer tokens, role-based access control, and token revocation.',
          keyPoints: [
            'Argon2 vs Bcrypt password salting mechanics',
            'Signing and verifying JWTs securely with secret keys',
            'Role-based middleware guards for Admin vs Member routes',
          ],
          resources: [
            { id: 'fsw-res-13', title: 'OWASP Security Checklist', url: 'https://owasp.org', type: 'DOCS' },
          ],
        },
      ],
    },
    {
      id: 'fsw-mod-8',
      week: 8,
      title: 'Deployment, CI/CD & Capstone Production Launch',
      description: 'Containerization, environment configuration, cloud deployment, and live capstone presentation.',
      lessons: [
        {
          id: 'fsw-8-1',
          title: 'Production Deployment & Continuous Integration',
          durationMinutes: 55,
          videoUrl: 'https://www.youtube.com/watch?v=F-sFp_AvHc8',
          summary: 'Taking your full-stack application live with production database provisioning, CORS headers, and zero-downtime deployments.',
          keyPoints: [
            'Environment variables hygiene in production',
            'Deploying frontend assets to CDN and Node backend to cloud',
            'Domain DNS, SSL certificates, and health check monitoring',
          ],
          resources: [
            { id: 'fsw-res-14', title: 'Capstone Project Evaluation Rubric', url: 'https://github.com', type: 'DOWNLOAD' },
          ],
        },
      ],
    },
  ],
  'genai-cybersecurity': [
    {
      id: 'cyber-mod-1',
      week: 1,
      title: 'Security Foundations & Threat Landscape',
      description: 'Core cybersecurity principles, threat actor profiles, and defensive posture analysis.',
      lessons: [
        {
          id: 'cyber-1-1',
          title: 'CIA Triad, Zero Trust Architecture & Threat Modeling',
          durationMinutes: 32,
          videoUrl: 'https://www.youtube.com/watch?v=inWWhr5tnEA',
          summary: 'Learn the fundamentals of cybersecurity, Zero Trust architecture, and how modern threat intelligence feeds operate.',
          keyPoints: [
            'Confidentiality, Integrity, Availability breakdown',
            'Zero Trust: Never trust, always verify principles',
            'STRIDE threat modeling methodology',
          ],
          resources: [
            { id: 'cyber-res-1', title: 'NIST Cybersecurity Framework', url: 'https://www.nist.gov/cyberframework', type: 'DOCS' },
          ],
        },
      ],
    },
    {
      id: 'cyber-mod-2',
      week: 2,
      title: 'Networking & Reconnaissance',
      description: 'Packet analysis, port scanning, OSINT gathering, and attack surface enumeration.',
      lessons: [
        {
          id: 'cyber-2-1',
          title: 'Wireshark Packet Analysis & Nmap Network Auditing',
          durationMinutes: 45,
          videoUrl: 'https://www.youtube.com/watch?v=4b72j6qJ5mE',
          summary: 'Hands-on network scanning: packet disassembly, port detection, protocol vulnerabilities, and firewall evasion techniques.',
          keyPoints: [
            'TCP three-way handshake and SYN scans',
            'Wireshark traffic filters and protocol dissection',
            'Mapping exposed surface areas with Nmap scripts',
          ],
          resources: [
            { id: 'cyber-res-2', title: 'Wireshark Sample PCAP Files', url: 'https://www.wireshark.org/sample_captures/', type: 'DOWNLOAD' },
          ],
        },
      ],
    },
  ],
};

export function buildDefaultModules(title: string, durationWeeks: number): CourseModule[] {
  const result: CourseModule[] = [];
  for (let w = 1; w <= durationWeeks; w++) {
    const modId = `mod-${w}`;
    result.push({
      id: modId,
      week: w,
      title: `Week ${w}: ${title} — Core Module ${w}`,
      description: `In-depth exploration of core practical concepts, hands-on lab exercises, and projects for week ${w}.`,
      lessons: [
        {
          id: `lesson-${w}-1`,
          title: `Core Lecture: Theory & Architecture (Part 1)`,
          durationMinutes: 30 + (w * 2),
          videoUrl: 'https://www.youtube.com/watch?v=kUMe1FH4CHE',
          summary: `Comprehensive overview of the weekly subject matter, architectural patterns, and industry best practices.`,
          keyPoints: [
            'Understanding foundational principles',
            'Common edge cases and error handling',
            'Practical implementation breakdown',
          ],
          resources: [
            { id: `res-${w}-1`, title: `Week ${w} Reference Slides`, url: 'https://github.com', type: 'SLIDES' },
            { id: `res-${w}-2`, title: `Official Documentation`, url: 'https://github.com', type: 'DOCS' },
          ],
        },
        {
          id: `lesson-${w}-2`,
          title: `Hands-On Lab & Practical Implementation (Part 2)`,
          durationMinutes: 45,
          videoUrl: 'https://www.youtube.com/watch?v=JJSoEo8JSnc',
          summary: `Step-by-step code-along session applying everything learned in the previous lecture into a working project.`,
          keyPoints: [
            'Setting up development environment',
            'Live coding and step-by-step implementation',
            'Testing, debugging, and verification',
          ],
          resources: [
            { id: `res-${w}-3`, title: `Lab Starter Repository`, url: 'https://github.com', type: 'GITHUB' },
          ],
        },
      ],
    });
  }
  return result;
}
