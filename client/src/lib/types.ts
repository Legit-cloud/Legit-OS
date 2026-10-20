export type Role = 'USER' | 'ADMIN';
export type Tier = 'PAY_AS_YOU_GO' | 'PRO_MONTHLY' | 'VIP';
export type AccountStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'REJECTED' | 'SUSPENDED' | 'BANNED';

export interface User {
  id: string;
  fullName: string;
  username?: string | null;
  email: string;
  phone: string | null;
  bio: string | null;
  role: Role;
  tier: Tier;
  status: AccountStatus;
  verified: boolean;
  idDocument?: string | null;
  idType?: string | null;
  facePicture?: string | null;
  verificationNote?: string | null;
  verifiedAt?: string | null;
  points: number;
  streakDays: number;
  badge: string;
  planRenewsAt: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  userId: string;
  kind: 'COURSE' | 'SUBSCRIPTION' | 'BOOKING' | 'LOUNGE' | 'OTHER';
  refId: string | null;
  description: string;
  amount: number;
  status: 'PENDING' | 'AWAITING_REVIEW' | 'PAID' | 'VOID';
  createdAt: string;
  paidAt: string | null;
}

export interface PaymentProof {
  id: string;
  userId: string;
  invoiceId: string | null;
  amount: number;
  note: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  invoice?: Pick<Invoice, 'description'> | Invoice | null;
}

export type Category = 'DESK' | 'FACILITY' | 'PROGRAM' | 'HARDWARE' | 'LOUNGE';

export interface CatalogItem {
  id: string;
  category: Category;
  name: string;
  description: string;
  price: number;
  unit: 'hour' | 'day' | 'month' | 'item';
  available: boolean;
  sortOrder: number;
  totalCapacity?: number;
  maxCapacity?: number;
  bookedUnits?: number;
  availableUnits?: number;
}

export interface Booking {
  id: string;
  itemId: string;
  item: CatalogItem;
  quantity: number;
  amount: number;
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface LoungeOrder {
  id: string;
  itemsJson: string;
  customItem: string | null;
  notes: string | null;
  total: number;
  status: 'PLACED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
}

export type ResourceType = 'GITHUB' | 'SLIDES' | 'DOCS' | 'DOWNLOAD';

export interface LessonResource {
  id: string;
  title: string;
  url: string;
  type: ResourceType;
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

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: string;
  durationWeeks: number;
  fullPrice: number;
  halfPrice: number;
  moduleCount: number;
  enrollment: { paidAmount: number; isFullyPaid: boolean } | null;
  hasAccess: boolean;
  openInvoice: Invoice | null;
  modules?: CourseModule[];
}

export interface ClassroomData {
  course: Course;
  modules: CourseModule[];
  enrollment: { paidAmount: number; isFullyPaid: boolean };
  completedLessonIds: string[];
  progressPercent: number;
}


export interface Rider {
  id: string;
  name: string;
  phone: string;
  vehicleType: Vehicle;
  plate: string;
  available: boolean;
}

export type Vehicle = 'Bike' | 'Keke' | 'Cab';

export interface TransitRequest {
  id: string;
  pickupLocation: string;
  dropoffLocation: string;
  vehicleType: Vehicle;
  fareEstimate: number;
  status: 'REQUESTED' | 'ASSIGNED' | 'EN_ROUTE' | 'COMPLETED' | 'CANCELLED';
  rider: Rider | null;
  createdAt: string;
  updatedAt: string;
}

export interface HubEvent {
  id: string;
  kind: 'EVENT' | 'GAME';
  title: string;
  description: string;
  location: string;
  startsAt: string | null;
  capacity: number;
  externalUrl: string | null;
  rsvpCount?: number;
  attending?: boolean;
}

export interface ChatMessage {
  id: string;
  channel: string;
  content: string;
  createdAt: string;
  sender: { id: string; fullName: string; role: Role; tier: Tier };
}

export interface Member {
  id: string;
  fullName: string;
  tier: Tier;
  badge: string;
  role: Role;
  online: boolean;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface TelemetryLog {
  id: string;
  level: 'INFO' | 'WARN' | 'SECURITY' | 'ADMIN';
  message: string;
  createdAt: string;
}

export interface Partner {
  id: string;
  name: string;
  category: string;
  website: string | null;
  description: string;
}

export type BroadcastType = 'POPUP' | 'NOTIFICATION' | 'BANNER' | 'COMBO';
export type BroadcastSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'URGENT';
export type BroadcastTarget = 'ALL' | 'TIER' | 'USER';

export interface BroadcastEntry {
  id: string;
  type: BroadcastType;
  title: string;
  body: string;
  target: BroadcastTarget;
  targetUserId?: string;
  targetUserName?: string;
  tier?: string;
  severity: BroadcastSeverity;
  actionUrl?: string;
  actionLabel?: string;
  senderId: string;
  senderName: string;
  deliveredCount: number;
  createdAt: string;
}

export type AdminInviteStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export interface AdminInvite {
  id: string;
  email: string;
  fullName: string;
  token: string;
  invitedBy: string;
  status: AdminInviteStatus;
  expiresAt: string;
  createdAt: string;
}

