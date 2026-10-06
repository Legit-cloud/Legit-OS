# L.E.G.I.T Innovation Hub Platform

Full-stack platform for the L.E.G.I.T Innovation Hub, Ibadan:

| Surface | Route (dev) | Production subdomain |
| --- | --- | --- |
| Public marketing site | `/` | `legitinnovationhub.com` |
| Client terminal (L.E.G.I.T OS) | `/app` | `app.legitinnovationhub.com` |
| Admin Command Center | `/admin` (ADMIN role only) | `admin.legitinnovationhub.com` |

**Stack:** React 19 + Vite + TypeScript, Tailwind CSS v4, Framer Motion, Lucide, Zustand, TanStack Query ·
Express 5 + Socket.io · Prisma + SQLite · JWT auth with USER / ADMIN roles.

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

Everything chargeable creates an **Invoice** (course, booking, lounge order, Pro subscription).
Members pay by bank transfer to the hub account and upload a receipt on **Finance & Logs**.
An admin approves or rejects it in **Action Queue**. Approval settles the invoice and applies its
effect automatically (`server/src/lib/ledger.ts`):

- **Course**: enrolment is created or updated, and the classroom unlocks at ≥50% paid
  (first half of modules) or 100% (all modules).
- **Booking**: confirmed. Desk and facility bookings can then be checked in, which starts the workspace timer.
- **Lounge**: the order moves to *Preparing*.
- **Subscription**: the tier is upgraded and renews in 30 days.

Each verified payment earns 50 hub points and each daily visit earns 5. Badges level up at 150 / 500 / 1000 points.

## Realtime

Socket.io (JWT-authenticated) carries community chat (`Global Community` plus a private
`Hub Support Desk` thread per member), presence, notifications, transit dispatch updates,
admin queue refreshes and the live telemetry console. Suspending or banning a user
disconnects their sockets immediately.

## Project layout

```
server/
  prisma/schema.prisma   data model     prisma/seed.ts   demo data
  src/index.ts           Express + Socket.io bootstrap
  src/socket.ts          chat & presence
  src/lib/               auth, ledger (invoice settlement), telemetry, realtime helpers
  src/routes/            auth, public, hub (catalog/bookings/lounge), academy, finance,
                         community (events/network/notifications/profile), transit, admin
client/src/
  pages/public/          landing + auth
  pages/app/             member terminal pages
  pages/admin/           admin portal pages
  components/            UI kit, shell, chat panel, telemetry console
```

## Things to configure before launch

- Prices that were not in the brief are **placeholders**: hot desk, day pass, CC HUB/GATEWAY, J.B.C,
  hardware rentals, Munchkins and soft drinks. Edit them in **Admin → Hub Assets**. 
- Transit fares (`server/src/routes/transit.ts`) are flat estimates: Bike ₦1,500, Keke ₦2,000, Cab ₦4,500.
- The Scrabble launcher URL is a placeholder. Change it in **Admin → Events & Games**.
