import { Platform, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { daysAgo } from "./dateService";

export type InfluencerFilters = {
  search?: string;
  state?: string;
  city?: string;
  platform?: Platform;
  periodDays?: number | null;
  regions?: string[];
};

export type InfluencerProfileInput = {
  platform: Platform;
  handle: string;
  url?: string | null;
  externalId?: string | null;
};

export type InfluencerInput = {
  name: string;
  state: string;
  city?: string | null;
  avatarUrl?: string | null;
  notes?: string | null;
  profiles?: InfluencerProfileInput[];
};

export type AggregatedInfluencer = {
  id: number;
  name: string;
  avatarUrl: string | null;
  state: string;
  city: string;
  notes: string | null;
  platforms: Platform[];
  totalFollowers: number;
  totalPosts: number;
  growthAbsolute: number;
  growthPercent: number;
};

export async function listInfluencers(filters: InfluencerFilters): Promise<AggregatedInfluencer[]> {
  const since = filters.periodDays === null ? undefined : daysAgo(filters.periodDays ?? 30);

  const where: Prisma.InfluencerWhereInput = {
    AND: [
      filters.regions && filters.regions.length > 0 ? { state: { in: filters.regions } } : {},
      filters.state ? { state: filters.state } : {},
      filters.city ? { city: filters.city } : {},
      filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { city: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const influencers = await prisma.influencer.findMany({
    where,
    include: {
      socialProfiles: {
        where: filters.platform ? { platform: filters.platform } : {},
        include: {
          metrics: {
            where: since ? { date: { gte: since } } : undefined,
            orderBy: { date: "asc" },
          },
        },
      },
    },
  });

  return influencers.map((inf) => {
    let totalFollowers = 0;
    let totalPosts = 0;
    let growth = 0;

    inf.socialProfiles.forEach((profile) => {
      const metrics = profile.metrics;
      if (metrics.length === 0) return;
      const start = metrics[0].followersCount;
      const end = metrics[metrics.length - 1].followersCount;
      totalFollowers += end;
      totalPosts += metrics.reduce((sum, m) => sum + m.postsCount, 0);
      growth += end - start;
    });

    const startFollowers = totalFollowers - growth;
    const growthPercent = startFollowers > 0 ? (growth / startFollowers) * 100 : 0;

    return {
      id: inf.id,
      name: inf.name,
      avatarUrl: inf.avatarUrl,
      state: inf.state,
      city: inf.city,
      notes: inf.notes ?? null,
      platforms: inf.socialProfiles.map((p) => p.platform),
      totalFollowers,
      totalPosts,
      growthAbsolute: growth,
      growthPercent,
    };
  });
}

export async function listStates() {
  const states = await prisma.influencer.findMany({
    distinct: ["state"],
    select: { state: true },
    orderBy: { state: "asc" },
  });
  return states.map((s) => s.state);
}

export async function listCities(state?: string) {
  const cities = await prisma.influencer.findMany({
    where: state ? { state } : undefined,
    distinct: ["city"],
    select: { city: true },
    orderBy: { city: "asc" },
  });
  return cities.map((c) => c.city);
}

export async function getInfluencerById(id: number, periodDays: number | null = 30, regions?: string[]) {
  const since = periodDays === null ? undefined : daysAgo(periodDays);
  return prisma.influencer.findFirst({
    where: {
      id,
      state: regions && regions.length > 0 ? { in: regions } : undefined,
    },
    include: {
      socialProfiles: {
        include: {
          metrics: {
            where: since ? { date: { gte: since } } : undefined,
            orderBy: { date: "asc" },
          },
        },
      },
    },
  });
}

export function aggregatePostsPerDay(profileMetrics: { date: Date; postsCount: number }[]) {
  const map = new Map<string, number>();
  profileMetrics.forEach((m) => {
    const key = m.date.toISOString().split("T")[0];
    map.set(key, (map.get(key) ?? 0) + m.postsCount);
  });
  return Array.from(map.entries())
    .map(([date, posts]) => ({ date, posts }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function createInfluencer(payload: InfluencerInput) {
  const state = payload.state.toUpperCase();
  const city = payload.city ?? "";

  return prisma.influencer.create({
    data: {
      name: payload.name,
      avatarUrl: payload.avatarUrl,
      state,
      city,
      notes: payload.notes,
      socialProfiles: payload.profiles && payload.profiles.length > 0
        ? {
            create: payload.profiles.map((p) => ({
              platform: p.platform,
              handle: p.handle,
              url: p.url,
              externalId: p.externalId,
            })),
          }
        : undefined,
    },
    include: {
      socialProfiles: true,
    },
  });
}

export async function updateInfluencer(
  id: number,
  payload: InfluencerInput,
  regions?: string[],
) {
  const state = payload.state.toUpperCase();
  const city = payload.city ?? "";

  const existing = await prisma.influencer.findFirst({
    where: {
      id,
      state: regions && regions.length > 0 ? { in: regions } : undefined,
    },
    include: { socialProfiles: true },
  });

  if (!existing) return null;

  // Update or create social profiles without deleting history
  const existingByPlatform = new Map(existing.socialProfiles.map((p) => [p.platform, p]));

  for (const profile of payload.profiles ?? []) {
    const found = existingByPlatform.get(profile.platform);
    if (found) {
      await prisma.socialProfile.update({
        where: { id: found.id },
        data: {
          handle: profile.handle,
          url: profile.url,
          externalId: profile.externalId,
        },
      });
    } else {
      await prisma.socialProfile.create({
        data: {
          influencerId: existing.id,
          platform: profile.platform,
          handle: profile.handle,
          url: profile.url,
          externalId: profile.externalId,
        },
      });
    }
  }

  const updated = await prisma.influencer.update({
    where: { id: existing.id },
    data: {
      name: payload.name,
      avatarUrl: payload.avatarUrl,
      state,
      city,
      notes: payload.notes,
    },
    include: { socialProfiles: true },
  });

  return updated;
}

export async function deleteInfluencer(id: number, regions?: string[]) {
  const existing = await prisma.influencer.findFirst({
    where: {
      id,
      state: regions && regions.length > 0 ? { in: regions } : undefined,
    },
  });
  if (!existing) return null;

  await prisma.influencer.delete({ where: { id: existing.id } });
  return true;
}
