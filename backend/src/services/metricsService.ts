import { Platform } from "@prisma/client";
import { prisma } from "../config/prisma";
import { daysAgo, getLastNWeekStarts } from "./dateService";

type MetricsFilters = {
  state?: string;
  city?: string;
  platform?: Platform;
  periodDays?: number | null;
  regions?: string[];
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

export async function getPlatformDistribution(filters: MetricsFilters = {}) {
  // Instead of grouping by platform (which counts profiles), we fetch all profiles
  // and sum their latest follower count.
  const profiles = await prisma.socialProfile.findMany({
    where: {
      platform: filters.platform || undefined,
      influencer: {
        state: filters.regions && filters.regions.length > 0 ? { in: filters.regions } : filters.state || undefined,
        city: filters.city || undefined,
      },
    },
    select: {
      platform: true,
      metrics: {
        orderBy: { date: "desc" },
        take: 1,
        select: { followersCount: true },
      },
    },
  });

  const aggregation = new Map<string, number>();

  profiles.forEach((p) => {
    const currentTotal = aggregation.get(p.platform) || 0;
    const latestFollowers = p.metrics[0]?.followersCount || 0;
    aggregation.set(p.platform, currentTotal + latestFollowers);
  });

  return Array.from(aggregation.entries()).map(([platform, count]) => ({
    platform,
    count,
  }));
}

export async function getStateDistribution(filters: MetricsFilters) {
  const influencers = await prisma.influencer.findMany({
    where: {
      state: filters.regions && filters.regions.length > 0 ? { in: filters.regions } : filters.state || undefined,
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
  const since = periodDays === null ? undefined : daysAgo(periodDays);

  const profiles = await prisma.socialProfile.findMany({
    where: {
      platform: filters.platform || undefined,
      influencer: {
        state: filters.regions && filters.regions.length > 0 ? { in: filters.regions } : filters.state || undefined,
        city: filters.city || undefined,
      },
    },
    include: {
      metrics: {
        where: since ? { date: { gte: since } } : undefined,
        orderBy: { date: "asc" },
      },
    },
  });

  // Determine range
  let startDate: Date | null = since ? new Date(since) : null;
  let endDate: Date | null = new Date();
  endDate.setUTCHours(0, 0, 0, 0);

  if (!startDate) {
    profiles.forEach((p) => {
      if (p.metrics.length > 0) {
        const first = p.metrics[0].date;
        if (!startDate || first < startDate) startDate = new Date(first);
      }
    });
  }

  if (!startDate) {
    return [];
  }

  const dates: string[] = [];
  const cursor = new Date(startDate);
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor <= endDate) {
    dates.push(cursor.toISOString().split("T")[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const totalsPerDate = new Map<string, number>(dates.map((d) => [d, 0]));

  profiles.forEach((profile) => {
    let idx = 0;
    let lastKnown: number | null = null;
    const metrics = profile.metrics;
    dates.forEach((dateStr) => {
      // Comparison at end of day to include any metric from that day
      const currentDate = new Date(dateStr + "T23:59:59.999Z");
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

type ManualMetricInput = {
  socialProfileId?: number;
  influencerId?: number;
  platform?: Platform;
  date: string;
  followersCount: number;
  postsCount: number;
};

export async function addManualMetric(input: ManualMetricInput, regions?: string[]) {
  if (!input.platform) {
    throw new Error("Platform is required");
  }
  const platform = String(input.platform).toLowerCase() as Platform;

  // Force date to be Noon UTC to avoid timezone shifts (e.g., midnight becoming previous day 21h)
  const parsedDate = new Date(input.date + "T12:00:00Z");
  if (isNaN(parsedDate.getTime())) {
    throw new Error("Invalid date");
  }
  // parsedDate.setHours(0, 0, 0, 0); // Removed to keep Noon UTC

  let profileId = input.socialProfileId;

  if (!profileId && input.influencerId) {
    const found = await prisma.socialProfile.findFirst({
      where: {
        influencerId: input.influencerId,
        platform,
      },
      include: { influencer: true },
    });
    if (!found) {
      throw new Error("Social profile not found for influencer/platform");
    }
    profileId = found.id;
    if (regions && regions.length > 0 && !regions.includes(found.influencer.state)) {
      throw new Error("Acesso restrito à UF");
    }
  }

  if (!profileId) {
    throw new Error("socialProfileId or influencerId+platform is required");
  }

  const profile = await prisma.socialProfile.findFirst({
    where: { id: profileId },
    include: { influencer: true },
  });

  if (!profile) {
    throw new Error("Social profile not found");
  }

  if (regions && regions.length > 0 && !regions.includes(profile.influencer.state)) {
    throw new Error("Acesso restrito à UF");
  }

  const metric = await prisma.metricDaily.upsert({
    where: {
      socialProfileId_date: {
        socialProfileId: profile.id,
        date: parsedDate,
      },
    },
    update: {
      followersCount: input.followersCount,
      postsCount: input.postsCount,
    },
    create: {
      socialProfileId: profile.id,
      date: parsedDate,
      followersCount: input.followersCount,
      postsCount: input.postsCount,
    },
  });

  return metric;
}

async function aggregateInfluencers(filters: MetricsFilters, overrideDays?: number): Promise<AggregatedInfluencerInternal[]> {
  const periodDays = overrideDays ?? filters.periodDays ?? 30;
  const since = periodDays === null ? undefined : daysAgo(periodDays);

  const influencers = await prisma.influencer.findMany({
    where: {
      state: filters.regions && filters.regions.length > 0 ? { in: filters.regions } : filters.state || undefined,
      city: filters.city || undefined,
    },
    include: {
      socialProfiles: {
        where: filters.platform ? { platform: filters.platform } : undefined,
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
    let growthAbsolute = 0;

    inf.socialProfiles.forEach((p) => {
      if (p.metrics.length === 0) return;
      const start = p.metrics[0].followersCount;
      const end = p.metrics[p.metrics.length - 1].followersCount;
      totalFollowers += end;
      // Excluir X da contagem de posts
      if (p.platform !== "x") {
        totalPosts += p.metrics.reduce((sum, m) => sum + m.postsCount, 0);
      }
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
