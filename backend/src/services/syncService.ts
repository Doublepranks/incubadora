import { prisma } from "../config/prisma";
import { fetchProfilesBatch, fetchRetryBatch } from "./apifyService";
import { SyncStatus } from "@prisma/client";

type SyncFilter = {
  handles?: string[];
  profileIds?: number[];
  regions?: string[];
};

type RetryCandidate = {
  profileId: number;
  platform: string;
  username: string;
  errorCode: string | null;
  errorMessage: string | null;
  attempt?: number | null;
  runId?: string | null;
  sourceActorId?: string | null;
};

export async function syncAllProfiles(filter?: SyncFilter) {
  const where: any = {};
  if (filter?.handles && filter.handles.length > 0) {
    where.handle = { in: filter.handles.map((h) => (h.startsWith("@") ? h : `@${h}`)) };
  }
  if (filter?.profileIds && filter.profileIds.length > 0) {
    where.id = { in: filter.profileIds };
  }
  if (filter?.regions && filter.regions.length > 0) {
    where.influencer = { state: { in: filter.regions } };
  }

  const profiles = await prisma.socialProfile.findMany({ where });
  if (profiles.length === 0) {
    return { success: 0, failed: 0, total: 0 };
  }

  const { metrics, errors } = await fetchProfilesBatch(profiles, 7);
  const errorMap = new Map<number, RetryCandidate[]>();
  errors.forEach((e) => {
    const list = errorMap.get(e.profileId) ?? [];
    list.push(e);
    errorMap.set(e.profileId, list);
  });

  let success = 0;
  let failed = 0;
  const retryable: RetryCandidate[] = [];
  const retryableCodes = new Set(["timeout", "rate_limit", "blocked", "captcha", "parse_error", "error"]);
  const errorProfiles: { profile: any; logId: number; errors: RetryCandidate[] }[] = [];

  for (const profile of profiles) {
    const log = await prisma.syncLog.create({
      data: {
        socialProfileId: profile.id,
        startedAt: new Date(),
        status: SyncStatus.success,
      },
    });

    try {
      const profileErrors = errorMap.get(profile.id) ?? [];
      const profileMetrics = metrics.get(profile.id) ?? [];

      // Registrar erros associados a este perfil, se houver
      if (profileErrors.length > 0) {
        const message = profileErrors
          .map((e) => `[${e.errorCode ?? "error"}] ${e.errorMessage ?? "unknown"}`)
          .join(" | ");

        await prisma.syncLog.update({
          where: { id: log.id },
          data: {
            finishedAt: new Date(),
            status: SyncStatus.error,
            errorMessage: message,
          },
        });
        failed += 1;

        // Separar erros retryable
        profileErrors.forEach((e) => {
          if (e.errorCode && retryableCodes.has(e.errorCode)) {
            retryable.push(e);
          }
        });
        errorProfiles.push({ profile, logId: log.id, errors: profileErrors });
        continue;
      }

      const data = profileMetrics.map((m) => ({
        socialProfileId: profile.id,
        date: m.date,
        followersCount: m.followersCount,
        postsCount: m.postsCount,
      }));

      if (data.length > 0) {
        // upsert para evitar manter valores antigos (ex.: posts_count 0)
        for (const row of data) {
          await prisma.metricDaily.upsert({
            where: { socialProfileId_date: { socialProfileId: row.socialProfileId, date: row.date } },
            create: row,
            update: { followersCount: row.followersCount, postsCount: row.postsCount },
          });
        }
      }

      await prisma.syncLog.update({
        where: { id: log.id },
        data: { finishedAt: new Date(), status: SyncStatus.success },
      });
      success += 1;
    } catch (err) {
      failed += 1;
      await prisma.syncLog.update({
        where: { id: log.id },
        data: {
          finishedAt: new Date(),
          status: SyncStatus.error,
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        },
      });
    }
  }

  // Tentar retry imediato se configurado
  if (retryable.length > 0 && process.env.APIFY_RETRY_ACTOR_ID) {
    const retryProfiles = errorProfiles.map((e) => e.profile);
    try {
      const { metrics: retryMetrics, errors: retryErrors } = await fetchRetryBatch(retryProfiles);
      const retryErrorMap = new Map<number, RetryCandidate[]>();
      retryErrors.forEach((e) => {
        const list = retryErrorMap.get(e.profileId) ?? [];
        list.push(e);
        retryErrorMap.set(e.profileId, list);
      });

      for (const ep of errorProfiles) {
        const profileId = ep.profile.id;
        const logId = ep.logId;
        const metricsData = retryMetrics.get(profileId) ?? [];

        if (metricsData.length > 0) {
          const data = metricsData.map((m) => ({
            socialProfileId: profileId,
            date: m.date,
            followersCount: m.followersCount,
            postsCount: m.postsCount,
          }));

          for (const row of data) {
            await prisma.metricDaily.upsert({
              where: { socialProfileId_date: { socialProfileId: row.socialProfileId, date: row.date } },
              create: row,
              update: { followersCount: row.followersCount, postsCount: row.postsCount },
            });
          }

          await prisma.syncLog.update({
            where: { id: logId },
            data: { finishedAt: new Date(), status: SyncStatus.success, errorMessage: null },
          });

          success += 1;
          failed -= 1; // reverte a contagem anterior de erro
        } else {
          const errs = retryErrorMap.get(profileId) ?? ep.errors;
          if (errs.length > 0) {
            const msg = errs
              .map((e) => `[retry:${e.errorCode ?? "error"}] ${e.errorMessage ?? "unknown"}`)
              .join(" | ");
            await prisma.syncLog.update({
              where: { id: logId },
              data: {
                finishedAt: new Date(),
                status: SyncStatus.error,
                errorMessage: msg,
              },
            });
          }
        }
      }
    } catch (err) {
      // Falha no retry não deve quebrar a resposta
      console.error("Retry actor failed:", err);
    }
  }

  return { success, failed, total: profiles.length, retryable };
}
