import cron from "node-cron";
import { syncAllProfiles } from "../services/syncService";
import { logSystem } from "../services/logService";
import { LogLevel } from "@prisma/client";

// Default: Monday at 03:00 UTC (0 3 * * MON)
const DEFAULT_CRON = "0 3 * * MON";

export function startScheduledSyncJob() {
  if (process.env.ENABLE_SYNC_JOB === "false") {
    console.log("Sync job disabled (ENABLE_SYNC_JOB=false)");
    return;
  }

  const expression = process.env.SYNC_CRON || DEFAULT_CRON;

  cron.schedule(expression, async () => {
    const startedAt = new Date();
    await logSystem({
      level: LogLevel.info,
      message: "Sync job iniciado",
      meta: { expression, startedAt },
    });

    try {
      const result = await syncAllProfiles();
      await logSystem({
        level: LogLevel.info,
        message: "Sync job concluído",
        meta: { expression, ...result },
      });
      console.log(`[sync job] completed: ${result.success} success, ${result.failed} failed`);
    } catch (err) {
      console.error("[sync job] failed", err);
      await logSystem({
        level: LogLevel.error,
        message: "Sync job falhou",
        meta: { expression, error: err instanceof Error ? err.message : "Unknown error" },
      });
    }
  });

  console.log(`Sync job scheduled with CRON "${expression}"`);
}
