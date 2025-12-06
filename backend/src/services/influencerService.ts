import { Platform, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { daysAgo } from "./dateService";

export type InfluencerFilters = {
  search?: string;
  state?: string;
  city?: string;
  platform?: Platform;
  periodDays?: number;
};

export type AggregatedInfluencer = {
  id: number;
  name: string;
  avatarUrl: string | null;
  state: string;
  city: string;
  platforms: Platform[];
  totalFollowers: number;
  totalPosts: number;
  growthAbsolute: number;
  growthPercent: number;
};

export async function listInfluencers(filters: InfluencerFilters): Promise<AggregatedInfluencer[]> {
  const periodDays = filters.periodDays ?? 30;
  const since = daysAgo(periodDays);

  const where: Prisma.InfluencerWhereInput = {
    AND: [
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
            where: { date: { gte: since } },
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

export async function getInfluencerById(id: number, periodDays = 30) {
  const since = daysAgo(periodDays);
  return prisma.influencer.findUnique({
    where: { id },
    include: {
      socialProfiles: {
        include: {
          metrics: {
            where: { date: { gte: since } },
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
