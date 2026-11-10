# L.E.G.I.T Innovation Hub Platform

Full-stack platform for the L.E.G.I.T Innovation Hub, Ibadan:

| Surface | Route (dev) | Description | Production subdomain |
| --- | --- | --- | --- |
| Public marketing site | `/` | Landing page, catalog overview & hub contact | `legitinnovationhub.com` |
| Member Auth & Onboarding | `/login`, `/register` | Member access with ID upload & face verification | `legitinnovationhub.com` |
| Member Portal | `/app` | Member workspace, bookings, transit & learning | `app.legitinnovationhub.com` |
| Admin Login Portal | `/admin/login` | Dedicated, protected portal authentication | `admin.legitinnovationhub.com` |
| Admin Command Center | `/admin` (ADMIN role only) | Full administration, operations & finance control | `admin.legitinnovationhub.com` |

**Stack:** React 19 + Vite + TypeScript, Tailwind CSS v4, Framer Motion, Lucide, Zustand, TanStack Query ·
Express 5 + Socket.io · Prisma + SQLite · JWT auth with USER / ADMIN roles · Redis Adapter ready.

## Key Features & Recent Updates

- **End-to-End Member Onboarding & KYC Verification Pipeline (`/register`):**
  - **Step 1 — Credentials Submission:** Full Name, Email, Phone, and Password validation.
  - **Step 2 — Email OTP Verification:** Automated 6-digit numeric OTP generation with 10-minute expiration via **Resend Email API**.
  - **Step 3 — Official ID Document Upload:** Supports National ID (NIN Slip/Card), Driver's License, International Passport, Voter's Card (PVC), and Student/Work ID.
  - **Step 4 — Live Biometric Face Capture:**
    - Real-time webcam viewfinder embedded directly in an interactive biometric framing reticle.
    - True horizontal mirror reflection (`transform: scaleX(-1)`) with animated laser-scanning line and HUD corner brackets.
    - Strict cross-browser autoplay compliance (`muted`, `defaultMuted`, `playsInline` DOM property enforcement).
    - Resilient hardware constraint fallbacks (`facingMode: 'user'` gracefully falls back to any available webcam).
    - High-quality snapshot generation via offscreen canvas, preserving orientation and resolution.
    - Built-in photo upload fallback for devices without camera hardware or with blocked permissions.
  - **Step 5 — Application Review & Live Status Tracking:**
    - **Under Review:** Live status screen with auto-polling (`/api/auth/me`) and Socket.io real-time push events (`profile:changed`).
    - **Approval Celebration:** Instant animated unlocking screen and automated redirection to `/app` upon admin approval.
    - **Dedicated Rejection & Document Revision:** Clear, dedicated rejection interface displaying the reviewer's specific feedback, thumbnails of previous uploads, and a one-click **"Re-upload Documents & Retake Photo"** action.
    - **Re-application Support:** Rejected accounts are never locked out permanently; applicants can re-submit revised documents while signed in or register afresh with the same email.

- **Transactional Email Infrastructure (Resend API):**
  - Production-ready transactional email engine (`server/src/lib/email.ts`) powered by the official `resend` SDK.
  - Dynamic environment variable resolution and instant error propagation.
  - Custom HTML email templates for:
    1. Member Email OTP Verification (`sendOtpEmail`)
    2. Verification Application Receipt (`sendApplicationSubmittedEmail`)
    3. Account Approval & Facility Activation (`sendApprovalEmail`)
    4. Identity Rejection & Revision Feedback (`sendRejectionEmail`)

- **Admin Verification Operations Desk:**
  - **Action Queue (`/admin` → Action Queue → Member Verifications):**
    - Side-by-side card preview of uploaded ID documents and live face snapshots.
    - One-click `[ Approve & Activate ]` settling account status to `ACTIVE`, marking `verified: true`, dispatching approval email, and notifying the applicant in real time.
    - `[ Reject ID ]` modal with customizable feedback note, status transition to `REJECTED`, and automated revision email dispatch.
  - **User Directory (`/admin` → User Directory):** Member profile drawer with identity document inspection desk and verification audit history.

- **Strict Access Control & Guarding:**
  - Client-side `RequireAuth` guard in `App.tsx` strictly routes non-active members (`status !== 'ACTIVE'`) to the verification desk, protecting `/app` workspace surfaces.
  - Server-side login guards blocking non-active accounts with descriptive, actionable error responses.

- **Real-Time Broadcast & Notification Engine:**
  - Administrators can dispatch hub-wide announcements directly via `/admin/broadcast` with urgency tiers (`low`, `medium`, `high`, `critical`), targeted audiences, and display modes (ticker marquee, pop-up modal, banner).
  - Real-time client delivery through `BroadcastReceiver` and dedicated member `/app/notifications` inbox.

- **Dedicated Admin Authentication:**
  - Isolated `/admin/login` interface with automated redirection, role verification guards (`RequireAuth admin`), and token validation.

- **Hardware & Device Rentals:**
  - Dedicated administrative inventory management (`/admin/hardware`) for laptops and hub hardware with checkout, maintenance, and return tracking.

- **Course & Curriculum Management:**
  - `/admin/courses` management suite for creating academy tracks, modules, pricing, and enrollment states.

- **Collapsible Responsive Navigation:**
  - Dynamic collapsible sidebar across dashboard layouts with smooth micro-animations.

- **Telemetry & Scalability:**
  - Real-time platform monitoring dashboard (`/admin/telemetry`) and Redis Socket.io adapter support for multi-instance deployments.

- **Unified Brand Experience & UI Refinements:**
  - **Clean Light-Mode Design System:** Streamlined, consistent light-mode interface across all public, member, and admin surfaces anchored around the official `#155dfd` brand color (including Hub Rewards & Badges, notification indicators, and "Coming Soon" feature previews for Lounge Orders and Transit Hub).
  - **Interactive Global Time Sync & Telemetry Widget (`/app`):**
    - Supports 12 major African and global time zones selectable via a map dropdown or interactive city pins on the telemetry map.
    - Instant toggle between `12H` and `24H` clock formats (persisted in `localStorage`).
    - Live hub operating status synced to **9:00 AM – 5:00 PM Nigerian Time (WAT / UTC+1)**.
  - **Interactive Facility Gallery & Responsive Lightbox (`/app/infra`):**
    - Auto-advancing photo slideshows on Private Facility cards (**Media Studio** and **Classroom**) with slide indicator dots and quick navigation controls.
    - Mobile-friendly, full-screen lightbox viewer with touch-swipe gestures, keyboard arrow/Escape navigation, and clickable thumbnail strips.
  - **Landing Page & Ecosystem Showcase (`/`):**
    - Full-width impact metrics grid, updated career placement pillar iconography, and custom startup/partner logos (**Cc-Hub**, **ISF**) in the *Built inside L.E.G.I.T Hub* showcase.
  - **Pay-As-You-Go Member Billing:** Simplified single-tier membership model where members book desks, facilities, courses, and hardware on demand.

## Getting started

```bash
npm install
cp server/.env.example server/.env   # then set a real JWT_SECRET
npm run db:setup                     # create the SQLite DB and seed demo data
npm run dev                          # API on :4000, web on http://localhost:5173
```

Seeded accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@legithub.com | Admin@12345 |
| Member | demo@legithub.com | Demo@12345 |
| Members | sophia@ / daniel@ / tobi@ / chiamaka@ / ibrahim@example.com | Member@12345 |

`npm run db:setup` re-runs the seed, which **wipes and repopulates** all tables.

### Production

```bash
npm run build   # prisma generate + vite build
npm start       # Express serves the API, Socket.io and client/dist on PORT
```

To serve the three surfaces on separate subdomains, point all three at the same server and
redirect `app.` → `/app` and `admin.` → `/admin` at the proxy, or split the SPA per host.

## How payments work

Everything chargeable creates an **Invoice** (course, booking, lounge order, hardware rental).
Members pay by bank transfer to the hub account and upload a receipt on **Finance & Logs**.
An admin approves or rejects it in **Action Queue**. Approval settles the invoice and applies its
effect automatically (`server/src/lib/ledger.ts`):

- **Course**: enrolment is created or updated, and the classroom unlocks at ≥50% paid
  (first half of modules) or 100% (all modules).
- **Booking**: confirmed. Desk and facility bookings can then be checked in, which starts the workspace timer.
- **Lounge**: the order moves to *Preparing*.
- **Hardware**: device assignment confirmed and rental timer begins.

Each verified payment earns 50 hub points and each daily visit earns 5. Badges level up at 150 / 500 / 1000 points.

## Realtime

Socket.io (JWT-authenticated) carries:
- Community chat (`Global Community` plus private `Hub Support Desk` threads)
- Live broadcast dispatch (emergency alerts, announcements, ticker updates)
- Member notifications and presence
- Transit dispatch updates & rider status
- Admin queue refreshes and the live telemetry console
- Instant socket termination for suspended or banned accounts

## Project layout

```
server/
  prisma/schema.prisma   data model     prisma/seed.ts   demo data
  src/index.ts           Express + Socket.io bootstrap
  src/socket.ts          chat, presence & socket channels
  src/lib/               auth, ledger, broadcasts, realtime, telemetry
  src/routes/            auth, public, hub, academy, finance, community, transit, admin
client/src/
  pages/public/          landing, contact, auth (login / register)
  pages/app/             member terminal (overview, infra, academy, transit, finance, notifications, profile)
  pages/admin/           admin portal (overview, queue, hardware, assets, courses, riders, comms, broadcast, telemetry, admin login)
  components/            UI kit, shell, chat panel, broadcast receiver, telemetry console
```

## Things to configure before launch

- **Resend Email API:** Set `RESEND_API_KEY` in `server/.env`. For production, add your custom domain in Resend (`resend.com/domains`) and configure `RESEND_FROM_EMAIL="L.E.G.I.T Innovation Hub <notifications@legitinnovationhub.com>"` to send transactional emails to any user.
- Prices that were not in the brief are **placeholders**: hot desk, day pass, CC HUB/GATEWAY, J.B.C,
  hardware rentals, Munchkins and soft drinks. Edit them in **Admin → Hub Assets**.
- Transit fares (`server/src/routes/transit.ts`) are flat estimates: Bike ₦1,500, Keke ₦2,000, Cab ₦4,500.
- The Scrabble launcher URL is a placeholder. Change it in **Admin → Events & Games**.
- Set a strong `JWT_SECRET`. For multi-instance deployments, move from SQLite to PostgreSQL
  (change the Prisma `provider`) and configure the Socket.io Redis adapter.
