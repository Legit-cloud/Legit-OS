import { AssetTrackerAgent } from './assetTracker.js';

// Standalone runner for testing the Asset Tracker in isolation.
// Run with: npx tsx server/src/workers/assetTracker.runner.ts

console.log('='.repeat(70));
console.log('   L.E.G.I.T INNOVATION HUB - ASSET TRACKING AGENT (STANDALONE)   ');
console.log('='.repeat(70));

const tracker = new AssetTrackerAgent({
  heartbeatIntervalMs: 10_000, // Pulses every 10 seconds
  defaultMaxCapacity: 10,
  stalePendingHours: 24,
  emitEvents: false,
});

let pulseCount = 0;

// Override tick to provide detailed per-asset tracking output in the terminal
const originalTick = tracker.tick.bind(tracker);
tracker.tick = async () => {
  pulseCount++;
  const time = new Date().toLocaleTimeString();
  const report = await originalTick();

  const totalAssets = report.assetStats.length;
  const totalOccupied = report.assetStats.reduce((sum, a) => sum + a.bookedUnits, 0);

  console.log(`\n[Heartbeat #${pulseCount} | ${time}] Tracked: ${totalAssets} assets | Total Occupied: ${totalOccupied} units`);

  for (const asset of report.assetStats) {
    const statusIcon = asset.isAvailable ? '🟢' : '🔴';
    const statusText = asset.isAvailable ? 'Available' : 'FULLY BOOKED';
    const bar = '█'.repeat(asset.bookedUnits) + '░'.repeat(asset.availableUnits);
    console.log(
      `  ${statusIcon} ${asset.name.padEnd(28)} [${bar}] ` +
      `${asset.bookedUnits}/${asset.maxCapacity} booked (${asset.availableUnits} remaining) - ${statusText}`
    );
  }

  if (report.warnedCount > 0) {
    console.log(`  ⚠️ Dispatched ${report.warnedCount} expiration warning(s).`);
  }
  if (report.expiredActiveCount > 0) {
    console.log(`  ⚡ Auto-completed ${report.expiredActiveCount} expired session(s) and released capacity.`);
  }
  if (report.cancelledStaleCount > 0) {
    console.log(`  🗑️ Auto-cancelled ${report.cancelledStaleCount} unpaid booking(s) older than 24h.`);
  }

  return report;
};

tracker.start();

const shutdown = () => {
  console.log('\n[Runner] Shutting down tracking agent gracefully...');
  tracker.stop();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
