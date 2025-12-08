import { prisma } from "../config/prisma";
import { fetchProfilesBatch } from "./apifyService";
import { SyncStatus } from "@prisma/client";

type SyncFilter = {
  handles?: string[];
  profileIds?: number[];
  regions?: string[];
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

  const batch = await fetchProfilesBatch(profiles, 7);
  let success = 0;
  let failed = 0;

  for (const profile of profiles) {
    const log = await prisma.syncLog.create({
      data: {
        socialProfileId: profile.id,
        startedAt: new Date(),
        status: SyncStatus.success,
      },
    });

    try {
      const metrics = batch.get(profile.id) ?? [];
      const data = metrics.map((m) => ({
        socialProfileId: profile.id,
        date: m.date,
        followersCount: m.followersCount,
        postsCount: m.postsCount,
      }));

      if (data.length > 0) {
        await prisma.metricDaily.createMany({
          data,
          skipDuplicates: true,
        });
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

  return { success, failed, total: profiles.length };
}
