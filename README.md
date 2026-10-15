# L.E.G.I.T Innovation Hub Platform

Full-stack platform for the L.E.G.I.T Innovation Hub, Ibadan:

| Surface | Route (dev) | Description | Production subdomain |
| --- | --- | --- | --- |
| Public marketing site | `/` | Landing page, catalog overview & hub contact | `legitinnovationhub.com` |
| Member Auth & Onboarding | `/login`, `/register` | Member access with ID upload & face verification | `legitinnovationhub.com` |
| Client terminal (L.E.G.I.T OS) | `/app` | Member workspace, bookings, transit & learning | `app.legitinnovationhub.com` |
| Admin Login Portal | `/admin/login` | Dedicated, protected portal authentication | `admin.legitinnovationhub.com` |
| Admin Command Center | `/admin` (ADMIN role only) | Full administration, operations & finance control | `admin.legitinnovationhub.com` |

**Stack:** React 19 + Vite + TypeScript, Tailwind CSS v4, Framer Motion, Lucide, Zustand, TanStack Query ·
Express 5 + Socket.io · Prisma + SQLite · JWT auth with USER / ADMIN roles · Redis Adapter ready.

## Key Features & Recent Updates

- **Real-Time Broadcast & Notification Engine:**
  - Administrators can dispatch hub-wide announcements directly via `/admin/broadcast` with urgency tiers (`low`, `medium`, `high`, `critical`), targeted audiences, and display modes (ticker marquee, pop-up modal, banner).
  - Real-time client delivery through `BroadcastReceiver` and dedicated member `/app/notifications` inbox.
- **Dedicated Admin Authentication:**
  - Isolated `/admin/login` interface with automated redirection, role verification guards (`RequireAuth admin`), and token validation.
- **Hardware & Device Rentals:**
  - Dedicated administrative inventory management (`/admin/hardware`) for laptops and hub hardware with checkout, maintenance, and return tracking.
- **Course & Curriculum Management:**
  - `/admin/courses` management suite for creating academy tracks, modules, pricing, and enrollment states.
- **Enhanced Registration & Onboarding:**
  - Identity verification with document upload and browser-based camera facial capture on registration.
- **Collapsible Responsive Navigation:**
  - Dynamic collapsible sidebar across dashboard layouts with smooth micro-animations.
- **Telemetry & Scalability:**
  - Real-time platform monitoring dashboard (`/admin/telemetry`) and Redis Socket.io adapter support for multi-instance deployments.

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

Everything chargeable creates an **Invoice** (course, booking, lounge order, hardware rental, Pro subscription).
Members pay by bank transfer to the hub account and upload a receipt on **Finance & Logs**.
An admin approves or rejects it in **Action Queue**. Approval settles the invoice and applies its
effect automatically (`server/src/lib/ledger.ts`):

- **Course**: enrolment is created or updated, and the classroom unlocks at ≥50% paid
  (first half of modules) or 100% (all modules).
- **Booking**: confirmed. Desk and facility bookings can then be checked in, which starts the workspace timer.
- **Lounge**: the order moves to *Preparing*.
- **Hardware**: device assignment confirmed and rental timer begins.
- **Subscription**: the tier is upgraded and renews in 30 days.

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

- Prices that were not in the brief are **placeholders**: hot desk, day pass, CC HUB/GATEWAY, J.B.C,
  hardware rentals, Munchkins and soft drinks. Edit them in **Admin → Hub Assets**.
- Transit fares (`server/src/routes/transit.ts`) are flat estimates: Bike ₦1,500, Keke ₦2,000, Cab ₦4,500.
- The Scrabble launcher URL is a placeholder. Change it in **Admin → Events & Games**.
- Set a strong `JWT_SECRET`. For multi-instance deployments, move from SQLite to PostgreSQL
  (change the Prisma `provider`) and configure the Socket.io Redis adapter.
