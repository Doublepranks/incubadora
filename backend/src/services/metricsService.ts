import { Platform } from "@prisma/client";
import { prisma } from "../config/prisma";
import { daysAgo, getLastNWeekStarts } from "./dateService";

type MetricsFilters = {
  state?: string;
  city?: string;
  platform?: Platform;
  periodDays?: number;
};

type AggregatedInfluencerInternal = {
  id: number;
  name: string;
  state: string;
  city: string;
  platforms: Platform[];
  totalFollowers: number;
  totalPosts: number;
  growthAbsolute: number;
  growthPercent: number;
  profiles: {
    platform: Platform;
    metrics: {
      date: Date;
      followersCount: number;
      postsCount: number;
    }[];
  }[];
};

export async function getOverview(filters: MetricsFilters) {
  const influencers = await aggregateInfluencers(filters);
  const totalInfluencers = influencers.length;
  const totalFollowers = influencers.reduce((sum: number, i) => sum + i.totalFollowers, 0);
  const totalGrowth = influencers.reduce((sum: number, i) => sum + i.growthAbsolute, 0);
  const totalPosts = influencers.reduce((sum: number, i) => sum + i.totalPosts, 0);
  const startFollowers = totalFollowers - totalGrowth;
  const growthPercent = startFollowers > 0 ? (totalGrowth / startFollowers) * 100 : 0;

  return { totalInfluencers, totalFollowers, totalPosts, growthPercent };
}

export async function getTopGrowth(filters: MetricsFilters, limit = 10) {
  const influencers = await aggregateInfluencers(filters);
  return influencers
    .sort((a, b) => b.growthAbsolute - a.growthAbsolute)
    .slice(0, limit);
}

export async function getPlatformDistribution() {
  const profiles = await prisma.socialProfile.groupBy({
    by: ["platform"],
    _count: { platform: true },
  });
  return profiles.map((p) => ({ platform: p.platform, count: p._count.platform }));
}

export async function getStateDistribution(filters: MetricsFilters) {
  const influencers = await prisma.influencer.findMany({
    where: {
      state: filters.state || undefined,
      city: filters.city || undefined,
      socialProfiles: filters.platform ? { some: { platform: filters.platform } } : undefined,
    },
    select: { state: true },
  });

  const map = new Map<string, number>();
  influencers.forEach((inf) => {
    const current = map.get(inf.state) ?? 0;
    map.set(inf.state, current + 1);
  });

  return Array.from(map.entries()).map(([state, count]) => ({ state, count }));
}

export async function getWeeklySeries(filters: MetricsFilters) {
  const weeks = getLastNWeekStarts(4);
  const influencers = await aggregateInfluencers(filters, 28);

  return influencers.map((inf) => {
    const weekTotals = weeks.map((weekStart, index) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const profiles = inf.profiles ?? [];
      let followers = 0;
      profiles.forEach((p) => {
        const metrics = p.metrics.filter((m) => m.date >= weekStart && m.date <= weekEnd);
        if (metrics.length > 0) {
          followers += metrics[metrics.length - 1].followersCount;
        }
      });
      return { week: index, followers };
    });
    return { influencerId: inf.id, weeks: weekTotals };
  });
}

export async function getFollowersTimeline(filters: MetricsFilters) {
  const periodDays = filters.periodDays ?? 30;
  const since = daysAgo(periodDays);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const profiles = await prisma.socialProfile.findMany({
    where: {
      platform: filters.platform || undefined,
      influencer: {
        state: filters.state || undefined,
        city: filters.city || undefined,
      },
    },
    include: {
      metrics: {
        where: { date: { gte: since } },
        orderBy: { date: "asc" },
      },
    },
  });

  // Build daily buckets from since to today
  const dates: string[] = [];
  const cursor = new Date(since);
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor <= today) {
    dates.push(cursor.toISOString().split("T")[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const totalsPerDate = new Map<string, number>(dates.map((d) => [d, 0]));

  profiles.forEach((profile) => {
    let idx = 0;
    let lastKnown: number | null = null;
    const metrics = profile.metrics;
    dates.forEach((dateStr) => {
      const currentDate = new Date(dateStr + "T00:00:00.000Z");
      while (idx < metrics.length && metrics[idx].date <= currentDate) {
        lastKnown = metrics[idx].followersCount;
        idx++;
      }
      if (lastKnown !== null) {
        totalsPerDate.set(dateStr, (totalsPerDate.get(dateStr) ?? 0) + lastKnown);
      }
    });
  });

  const entries = Array.from(totalsPerDate.entries()).map(([date, followers]) => ({ date, followers }));

  return entries;
}

async function aggregateInfluencers(filters: MetricsFilters, overrideDays?: number): Promise<AggregatedInfluencerInternal[]> {
  const periodDays = overrideDays ?? filters.periodDays ?? 30;
  const since = daysAgo(periodDays);

  const influencers = await prisma.influencer.findMany({
    where: {
      state: filters.state || undefined,
      city: filters.city || undefined,
    },
    include: {
      socialProfiles: {
        where: filters.platform ? { platform: filters.platform } : undefined,
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
    let growthAbsolute = 0;

    inf.socialProfiles.forEach((p) => {
      if (p.metrics.length === 0) return;
      const start = p.metrics[0].followersCount;
      const end = p.metrics[p.metrics.length - 1].followersCount;
      totalFollowers += end;
      totalPosts += p.metrics.reduce((sum, m) => sum + m.postsCount, 0);
      growthAbsolute += end - start;
    });

    const startFollowers = totalFollowers - growthAbsolute;
    const growthPercent = startFollowers > 0 ? (growthAbsolute / startFollowers) * 100 : 0;

    return {
      id: inf.id,
      name: inf.name,
      state: inf.state,
      city: inf.city,
      platforms: inf.socialProfiles.map((p) => p.platform),
      totalFollowers,
      totalPosts,
      growthAbsolute,
      growthPercent,
      profiles: inf.socialProfiles.map((p) => ({
        platform: p.platform,
        metrics: p.metrics,
      })),
    };
  });
}
