# L.E.G.I.T Innovation Hub — Project Structure & Database Schema

Comprehensive technical architecture, directory tree, database schema, and operational reference for the **L.E.G.I.T Innovation Hub Platform** (Ibadan, Nigeria).

---

## 1. High-Level Architecture

The project is an npm monorepo providing three distinct operational surfaces:
- **Public Marketing Site (`/`)**: Landing page showcasing programs, cohort applications, facility tours, impact metrics, and startup portfolios.
- **Member Terminal / L.E.G.I.T OS (`/app`)**: Self-service member portal for reserving hot desks/offices/studios, ordering lounge food/drinks, enrolling in academy courses, accessing online classrooms, requesting transit riders, and community networking.
- **Admin Command Center (`/admin`)**: Operations dashboard for hub administrators to manage the action queue (payment proof verification & kitchen orders), workstation hardware rentals, course curriculums, event scheduling, rider dispatches, user access controls, system telemetry, and broadcast announcements.

---

## 2. Visual Directory Tree

```
legit-innovation-hub/
│
├── .git/                                   # Git version control directory
├── .gitattributes                          # Git attributes and line endings configuration
├── .gitignore                              # Workspace-wide ignore rules
├── package.json                            # Root npm workspaces definition and orchestration scripts
├── package-lock.json                       # Dependency lockfile
├── README.md                               # Project documentation and getting started guide
├── To Do.txt                               # Active task backlog and pending feature implementations
├── PROJECT_STRUCTURE.md                    # Technical project architecture and database documentation
│
├── client/                                 # Frontend SPA Workspace (React 19 + Vite + Tailwind CSS v4)
│   ├── dist/                               # Production build output (served by Express in production)
│   ├── index.html                          # Single-page application HTML entry point
│   ├── package.json                        # Frontend dependencies & build scripts
│   ├── tsconfig.json                       # TypeScript configuration for client
│   ├── vite.config.ts                      # Vite configuration with React & Tailwind plugins
│   ├── public/                             # Static brand assets
│   │   ├── logo.png                        # Primary brand graphic
│   │   ├── logo-icon.png                   # Square icon mark
│   │   └── logo.svg                        # Vector SVG mark
│   └── src/                                # Frontend application source
│       ├── main.tsx                        # Client bootstrap & React Query provider
│       ├── App.tsx                         # Router declarations, lazy routes, and auth guards
│       ├── index.css                       # Tailwind CSS v4 config, custom font themes & glassmorphism
│       │
│       ├── components/                     # Reusable UI components & layouts
│       │   ├── BroadcastReceiver.tsx       # Live banner and popup modal listener for admin broadcasts
│       │   ├── ChatPanel.tsx               # Real-time WebSocket chat component with auto-scroll
│       │   ├── session.ts                  # Background session heartbeat and logout helpers
│       │   ├── Shell.tsx                   # Common responsive shell with sidebar & status bar
│       │   ├── TelemetryConsole.tsx        # Terminal-style real-time streaming audit log viewer
│       │   └── ui.tsx                      # Shared design system primitives (Button, Card, Badge, Modal, etc.)
│       │
│       ├── lib/                            # Frontend utilities & helpers
│       │   ├── api.ts                      # Type-safe fetch client with bearer auth & error normalization
│       │   ├── format.ts                   # Date/time formatters, WAT time zone handling, and Naira currency
│       │   ├── socket.ts                   # Socket.io client instance and event subscription hooks
│       │   └── types.ts                    # TypeScript domain interfaces, enums, and API models
│       │
│       ├── store/                          # Client state stores (Zustand)
│       │   ├── auth.ts                     # Persistent authentication state (JWT token and User object)
│       │   └── toast.ts                    # Global toast notification queue
│       │
│       └── pages/                          # Application surfaces & view controllers
│           ├── public/                     # Public marketing site & auth
│           │   ├── Landing.tsx             # Interactive landing page with dynamic tabs, stats, and FAQ
│           │   ├── landingData.ts          # Static copy and catalog data for the landing page
│           │   └── AuthPage.tsx            # Member login and account registration interface
│           │
│           ├── app/                        # Member Terminal (L.E.G.I.T OS)
│           │   ├── AppLayout.tsx           # Member layout shell, sidebar navigation & profile drawer
│           │   ├── Overview.tsx            # Real-time WAT clock, regional hub status map & quick links
│           │   ├── Infra.tsx               # Workstation booking, studio reservations & lounge menu
│           │   ├── Academy.tsx             # Tech Academy catalog & installment checkout
│           │   ├── Classroom.tsx           # Syllabus modules viewer (progressively unlocked by payment)
│           │   ├── Events.tsx              # Physical event RSVP tracking & community web games
│           │   ├── Transit.tsx             # On-demand rider hailing (Bike, Keke, Cab)
│           │   ├── Finance.tsx             # Invoice ledger, bank account details & payment proof upload
│           │   ├── Network.tsx             # Community chat channels ('Global Community' & 'Support Desk')
│           │   ├── Notifications.tsx       # Notifications inbox and broadcast alert history
│           │   └── Profile.tsx             # Member profile, bio, gamified badges, and Pro plan upgrades
│           │
│           └── admin/                      # Admin Command Center
│               ├── AdminLayout.tsx         # Admin command layout with operational badges and drawer
│               ├── AdminLogin.tsx          # Dedicated admin authentication gateway
│               ├── AdminOverview.tsx       # Live hub operations summary (active desks, revenue, queue)
│               ├── ActionQueue.tsx         # Payment proof approval & lounge order fulfillment
│               ├── HardwareRentals.tsx     # Workstation laptop/PC inventory & rental rates
│               ├── HubAssets.tsx           # Hub catalog manager (desks, studios, offices, cafe menu)
│               ├── AdminCourses.tsx        # Academy course creator, pricing & curriculum editor
│               ├── HubRiders.tsx           # Transit rider fleet roster & trip dispatching
│               ├── AdminEvents.tsx         # Hub events scheduler and community game links
│               ├── UserDirectory.tsx       # Member management, role adjustment, and suspension
│               ├── BroadcastCenter.tsx     # Multi-channel broadcast dispatcher (popups, banners, tier-target)
│               ├── Partners.tsx            # Ecosystem partners directory (investors, government, academia)
│               ├── Ledger.tsx              # Comprehensive accounting ledger & invoice voiding
│               ├── Comms.tsx               # Support thread inbox & broadcast triggers
│               └── Telemetry.tsx           # Rental device audit logs (app activity, web visit tracking)
│
└── server/                                 # Backend API Workspace (Express 5 + Socket.io + Prisma ORM)
    ├── .env                                # Local environment variables
    ├── .env.example                        # Template environment variables
    ├── package.json                        # Backend dependencies & build scripts
    ├── tsconfig.json                       # TypeScript compiler options for server
    │
    ├── prisma/                             # Database schema & migrations
    │   ├── dev.db                          # SQLite development database file
    │   ├── schema.prisma                   # Database schema definition file
    │   └── seed.ts                         # Database seeder populating demo members, courses, assets & riders
    │
    ├── uploads/                            # Server uploads & persistent storage
    │   ├── .gitkeep                        # Git tracking file
    │   ├── broadcasts.json                 # Persistent broadcast history and user acknowledgment logs
    │   └── *.png                           # Uploaded payment proof receipts
    │
    └── src/                                # Backend server source code
        ├── index.ts                        # Express server entry point, middleware pipeline, static bundle serving
        ├── socket.ts                       # Socket.io connection lifecycle, presence, and chat channel routing
        │
        ├── lib/                            # Shared backend infrastructure
        │   ├── auth.ts                     # JWT signing, token validation, user resolving, and role guards
        │   ├── broadcasts.ts               # Broadcast persistence engine, audience targeting, and acknowledgments
        │   ├── channels.ts                 # Chat channel access control (Global community vs private support)
        │   ├── env.ts                      # Environment variables, bank account details, and pricing constants
        │   ├── http.ts                     # HTTP error class and standard error builders
        │   ├── ledger.ts                   # Automatic invoice settlement, course unlocks, and point awarding
        │   ├── prisma.ts                   # Prisma client singleton instance
        │   ├── realtime.ts                 # Realtime Socket.io emitters for user alerts, presence & telemetry
        │   ├── telemetry.ts                # Audit logging engine (writes to DB and broadcasts via sockets)
        │   └── telemetryDb.ts              # PostgreSQL connection pool for device rental telemetry
        │
        └── routes/                         # Modular Express route controllers
            ├── academy.ts                  # Courses listing, checkout invoice creation, and classroom syllabus
            ├── admin.ts                    # Operations endpoints (queue, users, assets, telemetry, broadcasts)
            ├── auth.ts                     # Registration, login, user session renewal, and daily streaks
            ├── community.ts                # Hub events, RSVPs, member directory, notifications, and profile
            ├── finance.ts                  # Member finance dashboard, Pro upgrade, and receipt file upload
            ├── hub.ts                      # Asset catalog, bookings, session check-in, and lounge orders
            ├── public.ts                   # Public newsletter subscriptions and event previews
            └── transit.ts                  # Transit ride hailing, fare calculation, and cancellation
```

---

## 3. Database Schema (`server/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

enum SubscriptionTier {
  PAY_AS_YOU_GO
  PRO_MONTHLY
  VIP
}

enum AccountStatus {
  ACTIVE
  SUSPENDED
  BANNED
}

model User {
  id           String           @id @default(uuid())
  fullName     String
  email        String           @unique
  passwordHash String
  phone        String?
  bio          String?
  role         Role             @default(USER)
  tier         SubscriptionTier @default(PAY_AS_YOU_GO)
  status       AccountStatus    @default(ACTIVE)
  verified     Boolean          @default(false)
  points       Int              @default(0)
  streakDays   Int              @default(0)
  lastActiveAt DateTime?
  badge        String           @default("New Member")
  planRenewsAt DateTime?
  createdAt    DateTime         @default(now())

  payments      PaymentProof[]
  invoices      Invoice[]
  bookings      Booking[]
  loungeOrders  LoungeOrder[]
  courseAccess  UserCourse[]
  chatMessages  ChatMessage[]
  transitRides  TransitRequest[]
  rsvps         EventRsvp[]
  notifications Notification[]
}

// Every charge in the system is an invoice. Approving a payment proof marks
// its invoice PAID, which applies the invoice's effect (see lib/ledger.ts).
model Invoice {
  id          String         @id @default(uuid())
  userId      String
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  kind        String // COURSE, SUBSCRIPTION, BOOKING, LOUNGE, OTHER
  refId       String?
  description String
  amount      Float
  status      String         @default("PENDING") // PENDING, AWAITING_REVIEW, PAID, VOID
  createdAt   DateTime       @default(now())
  paidAt      DateTime?
  proofs      PaymentProof[]
}

model PaymentProof {
  id         String    @id @default(uuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  invoiceId  String?
  invoice    Invoice?  @relation(fields: [invoiceId], references: [id], onDelete: SetNull)
  amount     Float
  receiptUrl String
  note       String?
  status     String    @default("PENDING") // PENDING, APPROVED, REJECTED
  reviewNote String?
  reviewedAt DateTime?
  createdAt  DateTime  @default(now())
}

model Course {
  id            String       @id @default(uuid())
  slug          String       @unique
  title         String
  description   String
  level         String
  durationWeeks Int
  fullPrice     Float
  halfPrice     Float
  modulesJson   String       @default("[]")
  enrolledUsers UserCourse[]
}

model UserCourse {
  id          String   @id @default(uuid())
  userId      String
  courseId    String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  paidAmount  Float
  isFullyPaid Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@unique([userId, courseId])
}

// Bookable / purchasable hub assets: desks, facilities, programs, hardware, lounge menu.
model CatalogItem {
  id          String    @id @default(uuid())
  category    String // DESK, FACILITY, PROGRAM, HARDWARE, LOUNGE
  name        String
  description String    @default("")
  price       Float
  unit        String // hour, day, month, item
  available   Boolean   @default(true)
  sortOrder   Int       @default(0)
  bookings    Booking[]
}

model Booking {
  id        String      @id @default(uuid())
  userId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  itemId    String
  item      CatalogItem @relation(fields: [itemId], references: [id])
  quantity  Int
  amount    Float
  status    String      @default("PENDING_PAYMENT") // PENDING_PAYMENT, CONFIRMED, ACTIVE, COMPLETED, CANCELLED
  startsAt  DateTime?
  endsAt    DateTime?
  createdAt DateTime    @default(now())
}

model LoungeOrder {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  itemsJson  String
  customItem String?
  notes      String?
  total      Float
  status     String   @default("PLACED") // PLACED, PREPARING, READY, DELIVERED, CANCELLED
  createdAt  DateTime @default(now())
}

model ChatMessage {
  id        String   @id @default(uuid())
  channel   String   @default("Global Community") // "Global Community" or "support:<userId>"
  senderId  String
  sender    User     @relation(fields: [senderId], references: [id], onDelete: Cascade)
  content   String
  createdAt DateTime @default(now())

  @@index([channel, createdAt])
}

model Rider {
  id          String           @id @default(uuid())
  name        String
  phone       String
  vehicleType String // Bike, Keke, Cab
  plate       String           @default("")
  available   Boolean          @default(true)
  createdAt   DateTime         @default(now())
  rides       TransitRequest[]
}

model TransitRequest {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  pickupLocation  String
  dropoffLocation String   @default("L.E.G.I.T Innovation Hub")
  vehicleType     String // Bike, Keke, Cab
  fareEstimate    Float
  status          String   @default("REQUESTED") // REQUESTED, ASSIGNED, EN_ROUTE, COMPLETED, CANCELLED
  riderId         String?
  rider           Rider?   @relation(fields: [riderId], references: [id], onDelete: SetNull)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model HubEvent {
  id          String      @id @default(uuid())
  kind        String      @default("EVENT") // EVENT, GAME
  title       String
  description String
  location    String      @default("L.E.G.I.T Hub, Ibadan")
  startsAt    DateTime?
  capacity    Int         @default(50)
  externalUrl String?
  createdAt   DateTime    @default(now())
  rsvps       EventRsvp[]
}

model EventRsvp {
  id        String   @id @default(uuid())
  eventId   String
  userId    String
  event     HubEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([eventId, userId])
}

model Partner {
  id          String   @id @default(uuid())
  name        String
  category    String
  website     String?
  description String   @default("")
  createdAt   DateTime @default(now())
}

model Notification {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  body      String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}

model TelemetryLog {
  id        String   @id @default(uuid())
  level     String // INFO, WARN, SECURITY, ADMIN
  message   String
  actorId   String?
  createdAt DateTime @default(now())
}

model NewsletterSubscriber {
  id        String   @id @default(uuid())
  email     String   @unique
  createdAt DateTime @default(now())
}
```

---

## 4. Entity Descriptions & Relations

| Entity | Purpose & Core Fields | Relationships |
| :--- | :--- | :--- |
| **`User`** | Member and Administrator identities. Tracks `email`, `role` (`USER`/`ADMIN`), `tier` (`PAY_AS_YOU_GO`/`PRO_MONTHLY`/`VIP`), `status` (`ACTIVE`/`SUSPENDED`/`BANNED`), `points`, `streakDays`, and `badge`. | 1-to-many with `Invoice`, `PaymentProof`, `Booking`, `LoungeOrder`, `UserCourse`, `ChatMessage`, `TransitRequest`, `EventRsvp`, `Notification`. |
| **`Invoice`** | Central billing artifact for every transaction. `kind` (`COURSE`, `SUBSCRIPTION`, `BOOKING`, `LOUNGE`, `OTHER`), `amount`, `status` (`PENDING`, `AWAITING_REVIEW`, `PAID`, `VOID`). | Belongs to `User`. Has many `PaymentProof` entries. References specific booking/order/course IDs in `refId`. |
| **`PaymentProof`** | Uploaded bank transfer receipts (`receiptUrl`). Verified by admins (`status`: `PENDING`, `APPROVED`, `REJECTED`). | Belongs to `User` and optionally links to an `Invoice`. |
| **`CatalogItem`** | Physical hub assets & bookables: desks, media studio, meeting rooms, hardware, and food items. Has `category`, `price`, `unit` (`hour`, `day`, `month`, `item`), and `available`. | 1-to-many with `Booking`. |
| **`Booking`** | Desk and facility reservations with quantity, duration, and status (`PENDING_PAYMENT`, `CONFIRMED`, `ACTIVE`, `COMPLETED`, `CANCELLED`). | Belongs to `User` and `CatalogItem`. |
| **`Course`** | Tech Academy courses with title, description, level, duration in weeks, full price, half price, and JSON modular syllabus. | 1-to-many with `UserCourse` (enrolled members). |
| **`UserCourse`** | Join record tracking user enrollment, `paidAmount`, and `isFullyPaid` boolean flag. | Belongs to `User` and `Course`. Unique on `[userId, courseId]`. |
| **`LoungeOrder`** | Cafe food and beverage orders with line items JSON (`itemsJson`), notes, total cost, and status (`PLACED`, `PREPARING`, `READY`, `DELIVERED`, `CANCELLED`). | Belongs to `User`. |
| **`ChatMessage`** | Chat messages scoped by channel name (`Global Community` or `support:<userId>`). | Belongs to `User` (sender). Indexed on `[channel, createdAt]`. |
| **`Rider`** | Hub-affiliated transit fleet drivers (`name`, `phone`, `vehicleType`, `plate`, `available`). | 1-to-many with `TransitRequest`. |
| **`TransitRequest`** | Member ride requests from pickup location to the hub with fare estimate and ride status (`REQUESTED`, `ASSIGNED`, `EN_ROUTE`, `COMPLETED`, `CANCELLED`). | Belongs to `User` and optional `Rider`. |
| **`HubEvent`** | Physical hub meetups, pitch nights, and online web games with date, venue, capacity, and external game URLs. | 1-to-many with `EventRsvp`. |
| **`EventRsvp`** | Attendance registration join record. | Belongs to `User` and `HubEvent`. Unique on `[eventId, userId]`. |
| **`Partner`** | Ecosystem partners categorized by Government, Investor, Technology, Corporate, or Academic. | Standalone reference model. |
| **`Notification`** | In-app user notifications for real-time announcements, invoice updates, and ride dispatches. | Belongs to `User`. |
| **`TelemetryLog`** | System audit logs with severity levels (`INFO`, `WARN`, `SECURITY`, `ADMIN`) and optional actor ID. | Standalone logging model streamed via WebSockets. |
| **`NewsletterSubscriber`**| Public newsletter email subscriptions collected from landing page. | Unique on `email`. |

---

## 5. Ledger Settlement Lifecycle

All billable items adhere to an asynchronous invoice settlement pipeline defined in `server/src/lib/ledger.ts`:

1. **Invoice Generation**: User books a desk, orders lounge food, subscribes to Pro, or enrolls in a course. An `Invoice` is created in `PENDING` status.
2. **Payment Transfer & Receipt Upload**: User transfers funds to the hub's bank account (The Alternative Bank Limited) and uploads a receipt screenshot/PDF via the Finance page. The invoice transitions to `AWAITING_REVIEW`.
3. **Admin Verification**: An administrator approves the proof in **Action Queue** (`/admin/queue`).
4. **Automated Settlement (`settleInvoice`)**:
   - `COURSE`: User's `UserCourse` record is updated. If payment covers $\ge 50\%$, the first half of the syllabus is unlocked in Classroom; at $100\%$, the full course is unlocked.
   - `BOOKING`: Booking transitions to `CONFIRMED`. User can check in upon arrival at the hub.
   - `LOUNGE`: Order status changes to `PREPARING` and alerts kitchen staff.
   - `SUBSCRIPTION`: User tier upgrades to `PRO_MONTHLY` with renewal set to 30 days.
5. **Gamification & Rewards**:
   - User is automatically awarded **+50 hub points** per verified payment.
   - User badges dynamically update: *New Member* $\rightarrow$ *Rising Innovator* (150 pts) $\rightarrow$ *Power Builder* (500 pts) $\rightarrow$ *Hub Legend* (1000 pts).
   - Daily logins trigger `touchStreak`, granting **+5 hub points** and incrementing active day streaks.

---

## 6. Realtime WebSocket Architecture

Socket.io connects clients using JWT authentication (`server/src/socket.ts`):
- **Rooms**:
  - `user:<userId>`: Private notifications, ride status updates, invoice alerts, and targeted broadcasts.
  - `admins`: Privileged room for queue badges, audit logs, and support notifications.
  - `chan:Global Community`: Open chat room for all hub members.
  - `chan:support:<userId>`: Private support line between a member and hub administrators.
- **Key Events**:
  - `presence`: Broadcasts online user IDs whenever members connect or disconnect.
  - `chat:message`: Distributes real-time channel messages.
  - `queue:changed`: Pushes live queue refresh signals to admin terminals.
  - `transit:update`: Notifies members when a rider is assigned or en route.
  - `broadcast:popup` / `broadcast:banner`: Dispatches instant modals and announcements.
  - `telemetry`: Streams live server audit logs to the admin telemetry console.
  - `force-logout`: Disconnects banned or suspended users immediately.

---

## 7. Current Project Roadmap (`To Do.txt`)

Active backlog tasks for upcoming development:
1. **[Completed] Remove user panel from admin account**: Removed member terminal navigation items, dead footer links, and unused imports from the admin layout.
2. **Hub Asset Tracking Agent**: Develop an automated agent to monitor current and available hub physical assets and workstations.
3. **OTP Email Verification**: Implement email-based one-time password verification for user registration and security actions.
4. **Google Drive Video Streaming**: Integrate video player streaming directly from Google Drive into Academy Classroom modules.
5. **Multi-Asset Ordering UX**: Make booking multiple hub assets or workstations simultaneously intuitive and clear.
6. **Admin Invite & First-Time Password Reset**: Build an admin invitation workflow via email with forced password reset on first login.
