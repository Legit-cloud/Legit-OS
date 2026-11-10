import { prisma } from '../lib/prisma.js';
import { log } from '../lib/telemetry.js';
import { emitAll, emitToUser, emitToAdmins, notify, notifyAdmins } from '../lib/realtime.js';

export interface AssetTrackerConfig {
  /** How often the tracking agent runs its audit loop (in milliseconds). Default: 30,000ms (30s) */
  heartbeatIntervalMs?: number;
  /** Maximum capacity per asset if not specified in database. Default: 10 */
  defaultMaxCapacity?: number;
  /** Maximum hours an unpaid booking can stay pending before auto-cancellation. Default: 24 hours */
  stalePendingHours?: number;
  /** Whether to emit socket/realtime events when running. Default: true */
  emitEvents?: boolean;
}

export interface AssetAuditReport {
  timestamp: string;
  warnedCount: number;
  expiredActiveCount: number;
  cancelledStaleCount: number;
  assetStats: Array<{
    id: string;
    name: string;
    category: string;
    bookedUnits: number;
    maxCapacity: number;
    availableUnits: number;
    isAvailable: boolean;
  }>;
}

export class AssetTrackerAgent {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isTickInProgress = false;
  private warnedBookings = new Set<string>();
  private config: Required<AssetTrackerConfig>;

  constructor(config: AssetTrackerConfig = {}) {
    this.config = {
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 30_000,
      defaultMaxCapacity: config.defaultMaxCapacity ?? 10,
      stalePendingHours: config.stalePendingHours ?? 24,
      emitEvents: config.emitEvents ?? true,
    };
  }

  /**
   * Starts the background heartbeat loop.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`[AssetTrackerAgent] Started. Heartbeat interval: ${this.config.heartbeatIntervalMs / 1000}s, Max capacity/asset: ${this.config.defaultMaxCapacity}, Stale booking timeout: ${this.config.stalePendingHours}h`);

    // Run first tick immediately
    void this.tick();

    // Schedule regular heartbeat pulses
    this.timer = setInterval(() => {
      void this.tick();
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Stops the background heartbeat loop cleanly.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[AssetTrackerAgent] Stopped.');
  }

  /**
   * Executes a single tracking & reconciliation cycle.
   * Can be called directly by tests or the runner.
   */
  public async tick(): Promise<AssetAuditReport> {
    if (this.isTickInProgress) {
      console.warn('[AssetTrackerAgent] Previous audit tick is still running, skipping heartbeat pulse.');
      return {
        timestamp: new Date().toISOString(),
        warnedCount: 0,
        expiredActiveCount: 0,
        cancelledStaleCount: 0,
        assetStats: [],
      };
    }

    this.isTickInProgress = true;
    const now = new Date();

    try {
      // 1. Check for imminent session expirations and send warnings (15m before expiration)
      const warnedCount = await this.checkImminentExpirations(now);

      // 2. Expire sessions whose time has run out
      const expiredCount = await this.expireCompletedSessions(now);

      // 3. Auto-cancel stale unpaid bookings older than 24 hours
      const cancelledCount = await this.cancelStalePendingBookings(now);

      // 4. Reconcile asset availability & capacity
      const assetStats = await this.reconcileAssetCapacities();

      const report: AssetAuditReport = {
        timestamp: now.toISOString(),
        warnedCount,
        expiredActiveCount: expiredCount,
        cancelledStaleCount: cancelledCount,
        assetStats,
      };

      if (warnedCount > 0 || expiredCount > 0 || cancelledCount > 0) {
        console.log(`[AssetTrackerAgent] Cycle complete: ${warnedCount} warning(s) dispatched, ${expiredCount} expired session(s) closed, ${cancelledCount} stale booking(s) cancelled.`);
      }

      return report;
    } catch (error) {
      console.error('[AssetTrackerAgent] Error during tracking cycle:', error);
      throw error;
    } finally {
      this.isTickInProgress = false;
    }
  }

  /**
   * Finds ACTIVE bookings nearing expiration (e.g. within 15 minutes),
   * sends warning notifications to the user and admin once per session.
   */
  private async checkImminentExpirations(now: Date): Promise<number> {
    const activeBookings = await prisma.booking.findMany({
      where: {
        status: 'ACTIVE',
        endsAt: { gt: now },
        startsAt: { not: null },
      },
      include: {
        item: true,
        user: { select: { id: true, fullName: true } },
      },
    });

    let warnedCount = 0;

    for (const booking of activeBookings) {
      if (!booking.endsAt || !booking.startsAt) continue;
      if (this.warnedBookings.has(booking.id)) continue;

      const remainingMs = booking.endsAt.getTime() - now.getTime();
      const totalDurationMs = booking.endsAt.getTime() - booking.startsAt.getTime();

      // Dynamic warning threshold:
      // For standard sessions (>= 30 mins), warn 15 minutes before expiration.
      // For short/test sessions (< 30 mins), warn at 50% of total duration (e.g. 30s remaining for a 60s test session).
      const warningThresholdMs =
        totalDurationMs >= 30 * 60e3
          ? 15 * 60e3
          : Math.min(15 * 60e3, Math.max(10_000, Math.floor(totalDurationMs * 0.5)));

      if (remainingMs <= warningThresholdMs) {
        this.warnedBookings.add(booking.id);
        warnedCount++;

        const remainingMinutes = Math.max(1, Math.round(remainingMs / 60e3));
        const userMsg = `Your session for ${booking.item.name} is ending in approximately ${remainingMinutes} minute(s). Please wrap up or request an extension.`;
        const adminMsg = `Member ${booking.user.fullName}'s session for ${booking.item.name} is ending in approximately ${remainingMinutes} minute(s).`;

        await log(
          'INFO',
          `[AssetTracker] Sent expiration warning for ${booking.user.fullName} on ${booking.item.name} (${remainingMinutes}m remaining)`,
          booking.userId
        );

        if (this.config.emitEvents) {
          await notify(booking.userId, 'Session Ending Soon', userMsg);
          await notifyAdmins('Session Ending Soon', adminMsg);
          emitToUser(booking.userId, 'session:warning', {
            bookingId: booking.id,
            itemName: booking.item.name,
            endsAt: booking.endsAt,
            remainingMinutes,
          });
          emitToAdmins('session:warning', {
            bookingId: booking.id,
            userId: booking.userId,
            userName: booking.user.fullName,
            itemName: booking.item.name,
            endsAt: booking.endsAt,
            remainingMinutes,
          });
        }
      }
    }

    return warnedCount;
  }

  /**
   * Finds ACTIVE bookings where endsAt <= now, flips them to COMPLETED,
   * notifies the user and admin immediately, and records telemetry.
   */
  private async expireCompletedSessions(now: Date): Promise<number> {
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: 'ACTIVE',
        endsAt: { lte: now },
      },
      include: {
        item: true,
        user: { select: { id: true, fullName: true } },
      },
    });

    if (expiredBookings.length === 0) return 0;

    for (const booking of expiredBookings) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'COMPLETED' },
      });

      // Clear from warnedBookings set so memory stays clean
      this.warnedBookings.delete(booking.id);

      const userMessage = `Your session for ${booking.item.name} has concluded. Thank you for using L.E.G.I.T Innovation Hub!`;
      const adminMessage = `Session for member ${booking.user.fullName} (${booking.item.name}) has concluded.`;

      await log('INFO', `[AssetTracker] Completed session for ${booking.user.fullName} on ${booking.item.name}`, booking.userId);

      if (this.config.emitEvents) {
        await notify(booking.userId, 'Session Concluded', userMessage);
        await notifyAdmins('Session Completed', adminMessage);
        emitToUser(booking.userId, 'session:ended', { bookingId: booking.id, itemName: booking.item.name });
        emitToAdmins('session:ended', { bookingId: booking.id, userId: booking.userId, itemName: booking.item.name });
        emitToUser(booking.userId, 'bookings:changed', null);
      }
    }

    if (this.config.emitEvents) {
      emitToAdmins('queue:changed', null);
    }

    return expiredBookings.length;
  }

  /**
   * Finds PENDING_PAYMENT bookings older than stalePendingHours (e.g. 24h),
   * cancels them and voids any open invoice, releasing reserved slots.
   */
  private async cancelStalePendingBookings(now: Date): Promise<number> {
    const cutoffTime = new Date(now.getTime() - this.config.stalePendingHours * 3600e3);

    const staleBookings = await prisma.booking.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        createdAt: { lt: cutoffTime },
      },
      include: {
        item: true,
        user: { select: { id: true, fullName: true } },
      },
    });

    if (staleBookings.length === 0) return 0;

    for (const booking of staleBookings) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' },
      });

      // Void any associated unpaid invoice
      await prisma.invoice.updateMany({
        where: { refId: booking.id, status: 'PENDING' },
        data: { status: 'VOID' },
      });

      await log('INFO', `[AssetTracker] Auto-cancelled stale booking for ${booking.item.name} (${booking.user.fullName}) after ${this.config.stalePendingHours}h`, booking.userId);

      if (this.config.emitEvents) {
        await notify(
          booking.userId,
          'Booking Expired',
          `Your pending reservation for ${booking.item.name} expired because payment was not completed within ${this.config.stalePendingHours} hours.`
        );
        emitToUser(booking.userId, 'bookings:changed', null);
      }
    }

    if (this.config.emitEvents) {
      emitToAdmins('queue:changed', null);
    }

    return staleBookings.length;
  }

  /**
   * Reconciles current active & confirmed booking volume against the maximum capacity of each asset.
   * If an asset has reached capacity (e.g. 10/10 booked), marks it unavailable.
   * If slots free up, marks it available again.
   */
  private async reconcileAssetCapacities(): Promise<AssetAuditReport['assetStats']> {
    const bookableCategories = ['DESK', 'FACILITY', 'PROGRAM', 'HARDWARE'];

    const items = await prisma.catalogItem.findMany({
      where: { category: { in: bookableCategories } },
      include: {
        bookings: {
          where: { status: { in: ['ACTIVE', 'CONFIRMED'] } },
          select: { quantity: true },
        },
      },
    });

    const stats: AssetAuditReport['assetStats'] = [];

    for (const item of items) {
      const maxCapacity = (item as any).totalCapacity ?? this.config.defaultMaxCapacity;
      // Each active/confirmed booking represents 1 physical asset occupied for its chosen duration
      const bookedUnits = item.bookings.length;
      const availableUnits = Math.max(0, maxCapacity - bookedUnits);
      const shouldBeAvailable = availableUnits > 0;

      // If availability status changed due to capacity saturation or release
      if (item.available !== shouldBeAvailable) {
        await prisma.catalogItem.update({
          where: { id: item.id },
          data: { available: shouldBeAvailable },
        });

        await log(
          'INFO',
          `[AssetTracker] Asset '${item.name}' availability updated: ${shouldBeAvailable ? 'AVAILABLE' : 'FULLY BOOKED'} (${bookedUnits}/${maxCapacity} units occupied)`
        );

        if (this.config.emitEvents) {
          emitAll('catalog:changed', {
            action: 'update',
            id: item.id,
            available: shouldBeAvailable,
            bookedUnits,
            availableUnits,
          });
        }
      }

      stats.push({
        id: item.id,
        name: item.name,
        category: item.category,
        bookedUnits,
        maxCapacity,
        availableUnits,
        isAvailable: shouldBeAvailable,
      });
    }

    return stats;
  }
}

// Singleton helper for easy server integration when ready
let globalTracker: AssetTrackerAgent | null = null;

export function startAssetTrackingAgent(config?: AssetTrackerConfig): AssetTrackerAgent {
  if (!globalTracker) {
    globalTracker = new AssetTrackerAgent(config);
    globalTracker.start();
  }
  return globalTracker;
}

export function stopAssetTrackingAgent(): void {
  if (globalTracker) {
    globalTracker.stop();
    globalTracker = null;
  }
}
