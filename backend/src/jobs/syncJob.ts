import cron from "node-cron";
import { syncAllProfiles } from "../services/syncService";

// Default: Monday at 03:00 UTC (0 3 * * MON)
const DEFAULT_CRON = "0 3 * * MON";

export function startScheduledSyncJob() {
  if (process.env.ENABLE_SYNC_JOB === "false") {
    console.log("Sync job disabled (ENABLE_SYNC_JOB=false)");
    return;
  }

  const expression = process.env.SYNC_CRON || DEFAULT_CRON;

  cron.schedule(expression, async () => {
    try {
      const result = await syncAllProfiles();
      console.log(`[sync job] completed: ${result.success} success, ${result.failed} failed`);
    } catch (err) {
      console.error("[sync job] failed", err);
    }
  });

  console.log(`Sync job scheduled with CRON "${expression}"`);
}
