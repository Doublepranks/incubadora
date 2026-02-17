import { Platform, Series } from "@prisma/client";
import { prisma } from "../config/prisma";
import { daysAgo, getLastNWeekStarts } from "./dateService";

type MetricsFilters = {
  state?: string;
  city?: string;
  platform?: Platform;
  periodDays?: number | null;
  regions?: string[];
  series?: Series;
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
  const periodDays = filters.periodDays ?? 30;
  const since = periodDays === null ? null : daysAgo(periodDays);

  // Build WHERE conditions for influencer filtering
  const whereConditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.regions && filters.regions.length > 0) {
    whereConditions.push(`i.state = ANY($${paramIndex})`);
    params.push(filters.regions);
    paramIndex++;
  } else if (filters.state) {
    whereConditions.push(`i.state = $${paramIndex}`);
    params.push(filters.state);
    paramIndex++;
  }

  if (filters.city) {
    whereConditions.push(`i.city = $${paramIndex}`);
    params.push(filters.city);
    paramIndex++;
  }

  if (filters.series) {
    whereConditions.push(`i.series = $${paramIndex}::"Series"`);
    params.push(filters.series);
    paramIndex++;
  }

  if (filters.platform) {
    whereConditions.push(`sp.platform = $${paramIndex}::"Platform"`);
    params.push(filters.platform);
    paramIndex++;
  }

  const influencerWhere = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Count unique influencers
  const countQuery = `
    SELECT COUNT(DISTINCT i.id) as count
    FROM "Influencer" i
    LEFT JOIN "SocialProfile" sp ON sp.influencer_id = i.id
    ${influencerWhere}
  `;

  const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(countQuery, ...params);
  const totalInfluencers = Number(countResult[0]?.count ?? 0);

  // Get followers and growth using latest metric per profile
  // We use a subquery to get the first and last metric per profile within the period
  const metricsWhere = since ? `AND m.date >= $${paramIndex}` : '';
  if (since) {
    params.push(since);
    paramIndex++;
  }

  const metricsQuery = `
    WITH profile_metrics AS (
      SELECT 
        sp.id as profile_id,
        sp.platform,
        FIRST_VALUE(m.followers_count) OVER (PARTITION BY sp.id ORDER BY m.date ASC) as start_followers,
        FIRST_VALUE(m.followers_count) OVER (PARTITION BY sp.id ORDER BY m.date DESC) as end_followers,
        FIRST_VALUE(m.posts_count) OVER (PARTITION BY sp.id ORDER BY m.date ASC) as start_posts,
        FIRST_VALUE(m.posts_count) OVER (PARTITION BY sp.id ORDER BY m.date DESC) as end_posts
      FROM "SocialProfile" sp
      INNER JOIN "Influencer" i ON i.id = sp.influencer_id
      INNER JOIN "MetricDaily" m ON m.social_profile_id = sp.id
      ${influencerWhere} ${metricsWhere}
    ),
    aggregated AS (
      SELECT DISTINCT ON (profile_id)
        profile_id,
        platform,
        start_followers,
        end_followers,
        start_posts,
        end_posts
      FROM profile_metrics
    )
    SELECT 
      COALESCE(SUM(end_followers - start_followers), 0) as total_growth,
      COALESCE(SUM(CASE WHEN platform != 'x' THEN GREATEST(end_posts - start_posts, 0) ELSE 0 END), 0) as total_posts
    FROM aggregated
  `;

  const metricsResult = await prisma.$queryRawUnsafe<{ total_growth: bigint; total_posts: bigint }[]>(metricsQuery, ...params);

  // Separate query for absolute total followers (no period filter)
  const absoluteFollowersQuery = `
    WITH latest_metrics AS (
      SELECT DISTINCT ON (sp.id)
        sp.id as profile_id,
        m.followers_count
      FROM "SocialProfile" sp
      INNER JOIN "Influencer" i ON i.id = sp.influencer_id
      INNER JOIN "MetricDaily" m ON m.social_profile_id = sp.id
      ${influencerWhere}
      ORDER BY sp.id, m.date DESC
    )
    SELECT COALESCE(SUM(followers_count), 0) as total_followers
    FROM latest_metrics
  `;

  const absoluteFollowersResult = await prisma.$queryRawUnsafe<{ total_followers: bigint }[]>(absoluteFollowersQuery, ...params.slice(0, params.length - (since ? 1 : 0)));

  const totalFollowers = Number(absoluteFollowersResult[0]?.total_followers ?? 0);
  const totalGrowth = Number(metricsResult[0]?.total_growth ?? 0);
  const totalPosts = Number(metricsResult[0]?.total_posts ?? 0);
  const startFollowers = totalFollowers - totalGrowth;
  const growthPercent = startFollowers > 0 ? (totalGrowth / startFollowers) * 100 : 0;

  return { totalInfluencers, totalFollowers, totalPosts, growthPercent };
}

export async function getTopGrowth(filters: MetricsFilters, limit = 10) {
  const periodDays = filters.periodDays ?? 30;
  const since = periodDays === null ? null : daysAgo(periodDays);

  // Build WHERE conditions — separate influencer-only conditions from
  // those that reference SocialProfile (sp.*) so we can reuse them safely.
  const influencerConditions: string[] = [];
  const allConditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.regions && filters.regions.length > 0) {
    const cond = `i.state = ANY($${paramIndex})`;
    influencerConditions.push(cond);
    allConditions.push(cond);
    params.push(filters.regions);
    paramIndex++;
  } else if (filters.state) {
    const cond = `i.state = $${paramIndex}`;
    influencerConditions.push(cond);
    allConditions.push(cond);
    params.push(filters.state);
    paramIndex++;
  }

  if (filters.city) {
    const cond = `i.city = $${paramIndex}`;
    influencerConditions.push(cond);
    allConditions.push(cond);
    params.push(filters.city);
    paramIndex++;
  }

  if (filters.series) {
    const cond = `i.series = $${paramIndex}::"Series"`;
    influencerConditions.push(cond);
    allConditions.push(cond);
    params.push(filters.series);
    paramIndex++;
  }

  if (filters.platform) {
    // Platform condition references sp.*, so only add to allConditions
    allConditions.push(`sp.platform = $${paramIndex}::"Platform"`);
    params.push(filters.platform);
    paramIndex++;
  }

  // Full WHERE (for CTEs that JOIN SocialProfile)
  const influencerWhere = allConditions.length > 0 ? `WHERE ${allConditions.join(' AND ')}` : '';
  // Influencer-only WHERE (for final SELECT on Influencer table — no sp.* refs)
  const influencerOnlyWhere = influencerConditions.length > 0 ? `WHERE ${influencerConditions.join(' AND ')}` : '';

  const metricsWhere = since ? `AND m.date >= $${paramIndex}` : '';
  if (since) {
    params.push(since);
    paramIndex++;
  }

  // Add limit parameter
  params.push(limit);
  const limitParam = `$${paramIndex}`;

  const query = `
    WITH profile_growth AS (
      SELECT 
        sp.influencer_id,
        sp.platform,
        FIRST_VALUE(m.followers_count) OVER (PARTITION BY sp.id ORDER BY m.date ASC) as start_followers,
        FIRST_VALUE(m.followers_count) OVER (PARTITION BY sp.id ORDER BY m.date DESC) as end_followers
      FROM "SocialProfile" sp
      INNER JOIN "Influencer" i ON i.id = sp.influencer_id
      INNER JOIN "MetricDaily" m ON m.social_profile_id = sp.id
      ${influencerWhere} ${metricsWhere}
    ),
    influencer_growth AS (
      SELECT DISTINCT ON (influencer_id)
        influencer_id,
        SUM(end_followers - start_followers) OVER (PARTITION BY influencer_id) as growth_absolute,
        SUM(end_followers) OVER (PARTITION BY influencer_id) as total_followers
      FROM profile_growth
    )
    SELECT 
      i.id,
      i.name,
      i.state,
      i.city,
      COALESCE(ig.growth_absolute, 0) as "growthAbsolute",
      COALESCE(ig.total_followers, 0) as "totalFollowers",
      CASE WHEN COALESCE(ig.total_followers, 0) - COALESCE(ig.growth_absolute, 0) > 0 
           THEN (COALESCE(ig.growth_absolute, 0)::float / (COALESCE(ig.total_followers, 0) - COALESCE(ig.growth_absolute, 0))) * 100
           ELSE 0
      END as "growthPercent"
    FROM "Influencer" i
    LEFT JOIN influencer_growth ig ON ig.influencer_id = i.id
    ${influencerOnlyWhere}
    ORDER BY ig.growth_absolute DESC NULLS LAST
    LIMIT ${limitParam}
  `;

  type TopGrowthRow = {
    id: number;
    name: string;
    state: string;
    city: string;
    growthAbsolute: bigint;
    totalFollowers: bigint;
    growthPercent: number;
  };

  const results = await prisma.$queryRawUnsafe<TopGrowthRow[]>(query, ...params);

  return results.map(r => ({
    id: r.id,
    name: r.name,
    state: r.state,
    city: r.city,
    growthAbsolute: Number(r.growthAbsolute),
    totalFollowers: Number(r.totalFollowers),
    growthPercent: Number(r.growthPercent),
    platforms: [] as Platform[], // Not fetched in optimized query
    totalPosts: 0, // Not fetched in optimized query
    profiles: [], // Not fetched in optimized query
  }));
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
        series: filters.series || undefined,
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
  // Build WHERE clause dynamically for compatibility with groupBy
  const where: any = {};

  if (filters.regions && filters.regions.length > 0) {
    where.state = { in: filters.regions };
  } else if (filters.state) {
    where.state = filters.state;
  }

  if (filters.city) {
    where.city = filters.city;
  }

  if (filters.series) {
    where.series = filters.series;
  }

  if (filters.platform) {
    where.socialProfiles = { some: { platform: filters.platform } };
  }

  const results = await prisma.influencer.groupBy({
    by: ['state'],
    where,
    _count: { id: true },
    orderBy: { state: 'asc' },
  });

  return results.map(r => ({ state: r.state, count: r._count.id }));
}

export async function getGenderDistribution(filters: MetricsFilters) {
  const influencers = await prisma.influencer.findMany({
    where: {
      state: filters.regions && filters.regions.length > 0 ? { in: filters.regions } : filters.state || undefined,
      city: filters.city || undefined,
      series: filters.series || undefined,
      sex: { not: null },
    },
    select: { sex: true },
  });

  const counts = { masculino: 0, feminino: 0 };
  influencers.forEach((i) => {
    if (i.sex) counts[i.sex]++;
  });

  return [
    { sex: "masculino", count: counts.masculino },
    { sex: "feminino", count: counts.feminino },
  ];
}

export async function getGenderByRegion(filters: MetricsFilters) {
  const influencers = await prisma.influencer.findMany({
    where: {
      state: filters.regions && filters.regions.length > 0 ? { in: filters.regions } : filters.state || undefined,
      city: filters.city || undefined,
      series: filters.series || undefined,
      sex: { not: null },
    },
    select: { state: true, sex: true },
  });

  const map = new Map<string, { masculino: number; feminino: number }>();

  influencers.forEach((i) => {
    if (!i.sex) return;
    if (!map.has(i.state)) {
      map.set(i.state, { masculino: 0, feminino: 0 });
    }
    map.get(i.state)![i.sex]++;
  });

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([state, counts]) => ({ state, ...counts }));
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
        series: filters.series || undefined,
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
  // Use the latest metric date as the end of the series (avoids showing "tomorrow" when server timezone differs),
  // falling back to "today" when there are no metrics.
  let endDate: Date | null = null;

  if (!startDate) {
    profiles.forEach((p) => {
      if (p.metrics.length > 0) {
        const first = p.metrics[0].date;
        if (!startDate || first < startDate) startDate = new Date(first);
      }
    });
  }

  profiles.forEach((p) => {
    if (p.metrics.length > 0) {
      const last = p.metrics[p.metrics.length - 1].date;
      if (!endDate || last > endDate) endDate = new Date(last);
    }
  });

  if (!endDate) {
    endDate = new Date();
  }
  endDate.setUTCHours(0, 0, 0, 0);

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
      series: filters.series || undefined,
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
