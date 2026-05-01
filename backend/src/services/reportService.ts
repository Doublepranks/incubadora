import ExcelJS from "exceljs";
import { Platform, Series, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { daysAgo, startOfWeekMonday } from "./dateService";

type ReportFilters = {
  state?: string;
  city?: string;
  search?: string;
  regions?: string[];
  series?: Series;
  month?: number;
  year?: number;
  platform?: Platform;
  situacao?: string;
};

type WeeklyData = {
  platform: Platform;
  weekStart: Date;
  followers: number;
  posts: number;
  metricDate: Date;
};

type Pagination = { limit: number; offset: number };

type RankMode = "weekly" | "monthly";

type RankRow = {
  id: number;
  name: string;
  state: string;
  city: string | null;
  series: Series | null;
  weeks: { w3: number | null; w2: number | null; w1: number | null; w0: number | null };
  growthAbs: number;
  growthPct: number;
};

type RankResult = {
  data: RankRow[];
  totals: { w3: number; w2: number; w1: number; w0: number; growthAbs: number; growthPct: number };
};

export async function getReportData(filters: ReportFilters, options?: { pagination?: Pagination }) {
  let dateFilter: { gte?: Date; lte?: Date } | undefined;
  const targetYear = filters.month ? filters.year ?? new Date().getFullYear() : filters.year;
  if (filters.month && targetYear) {
    const startDate = new Date(targetYear, filters.month - 1, 1);
    const endDate = new Date(targetYear, filters.month, 0, 23, 59, 59, 999);
    dateFilter = { gte: startDate, lte: endDate };
  } else if (targetYear) {
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    dateFilter = { gte: startDate, lte: endDate };
  } else {
    dateFilter = { gte: daysAgo(28) };
  }

  const whereConditions: Prisma.InfluencerWhereInput[] = [];
  if (filters.regions && filters.regions.length > 0) whereConditions.push({ state: { in: filters.regions } });
  if (filters.state) whereConditions.push({ state: filters.state });
  if (filters.city) whereConditions.push({ city: filters.city });
  if (filters.series) whereConditions.push({ series: filters.series });
  if (filters.search) whereConditions.push({ name: { contains: filters.search, mode: "insensitive" } });
  if (filters.platform) whereConditions.push({ socialProfiles: { some: { platform: filters.platform } } });
  if (filters.situacao === "filiado") whereConditions.push({ isFiliado: true });
  else if (filters.situacao === "pre_candidato") whereConditions.push({ isPreCandidato: true });

  const where: Prisma.InfluencerWhereInput = { AND: whereConditions };

  const [influencers, total] = await Promise.all([
    prisma.influencer.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        socialProfiles: {
          where: filters.platform ? { platform: filters.platform } : undefined,
          include: {
            metrics: {
              where: { date: dateFilter },
              orderBy: { date: "asc" },
            },
          },
        },
      },
      take: options?.pagination?.limit,
      skip: options?.pagination?.offset,
    }),
    options?.pagination ? prisma.influencer.count({ where }) : Promise.resolve(0),
  ]);

  const items = influencers.map((inf) => {
    const weekly: WeeklyData[] = [];

    inf.socialProfiles.forEach((profile) => {
      profile.metrics.forEach((m) => {
        const weekStart = startOfWeekMonday(new Date(m.date));
        weekly.push({
          platform: profile.platform,
          weekStart,
          followers: m.followersCount,
          posts: m.postsCount,
          metricDate: new Date(m.date),
        });
      });
    });

    const grouped = groupWeekly(weekly);
    const totalFollowers = inf.socialProfiles.reduce((sum, p) => {
      const last = p.metrics[p.metrics.length - 1];
      return sum + (last ? last.followersCount : 0);
    }, 0);

    const totalPosts = inf.socialProfiles.reduce((sum, p) => {
      const last = p.metrics[p.metrics.length - 1];
      return sum + (last ? last.postsCount : 0);
    }, 0);

    return {
      id: inf.id,
      name: inf.name,
      state: inf.state,
      city: inf.city,
      avatarUrl: inf.avatarUrl,
      series: inf.series ?? null,
      platforms: inf.socialProfiles.map((p) => p.platform),
      totalFollowers,
      totalPosts,
      weekly: grouped,
    };
  });

  // const ordered = items.sort((a, b) => (b.totalFollowers ?? 0) - (a.totalFollowers ?? 0));

  return { items: items, total: options?.pagination ? total : items.length };
}

function groupWeekly(entries: WeeklyData[]) {
  const map = new Map<string, WeeklyData>();
  entries.forEach((e) => {
    const key = `${e.platform}-${e.weekStart.toISOString()}`;
    const current = map.get(key);
    if (!current || e.metricDate > current.metricDate) {
      map.set(key, e);
    }
  });
  return Array.from(map.values()).map(({ metricDate, ...rest }) => rest);
}

export async function generateExcel(filters: ReportFilters) {
  const { items } = await getReportData(filters);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relatorio");

  sheet.columns = [
    { header: "Nome", key: "name", width: 25 },
    { header: "Estado", key: "state", width: 10 },
    { header: "Municipio", key: "city", width: 20 },
    { header: "Serie", key: "series", width: 15 },
    { header: "Instagram", key: "instagram", width: 15 },
    { header: "X", key: "x", width: 10 },
    { header: "YouTube", key: "youtube", width: 15 },
    { header: "Kwai", key: "kwai", width: 12 },
    { header: "TikTok", key: "tiktok", width: 12 },
    { header: "Total Seguidores", key: "total", width: 18 },
  ];

  items.forEach((inf) => {
    const latestByPlatform = new Map<Platform, { weekStart: Date; followers: number }>();
    inf.weekly.forEach((w) => {
      const current = latestByPlatform.get(w.platform);
      if (!current || w.weekStart > current.weekStart) {
        latestByPlatform.set(w.platform, { weekStart: w.weekStart, followers: w.followers });
      }
    });

    sheet.addRow({
      name: inf.name,
      state: inf.state,
      city: inf.city,
      series: inf.series ?? "",
      instagram: latestByPlatform.get("instagram")?.followers ?? 0,
      x: latestByPlatform.get("x")?.followers ?? 0,
      youtube: latestByPlatform.get("youtube")?.followers ?? 0,
      kwai: latestByPlatform.get("kwai")?.followers ?? 0,
      tiktok: latestByPlatform.get("tiktok")?.followers ?? 0,
      total: inf.totalFollowers,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

export async function getRankData(filters: ReportFilters, options?: { mode?: RankMode }): Promise<RankResult> {
  const mode: RankMode = options?.mode === "monthly" ? "monthly" : "weekly";

  if (mode === "monthly" && (!filters.month || !filters.year)) {
    throw new Error("month/year required for monthly rank");
  }

  if (mode === "monthly") {
    return getMonthlyRank(filters as Required<Pick<ReportFilters, "month" | "year">> & ReportFilters);
  }

  return getWeeklyRank(filters);
}

async function getWeeklyRank(filters: ReportFilters): Promise<RankResult> {
  // Calculate the start of the current week (Monday)
  const thisWeekStart = startOfWeekMonday(new Date());

  // Define 4 weeks back: W0 (Current Complete), W1, W2, W3
  // Current logic: "Weekly Ranking" compares last 2 completed weeks usually
  // But user request implies generic "Monday Anchor" for any week displayed.

  // Let's define the week buckets.
  // W0: Most recent Monday (could be partial week if today is Tues)
  // W1: Monday before W0
  // ...

  const weeks: Date[] = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(thisWeekStart);
    d.setDate(d.getDate() - (i * 7));
    weeks.push(d);
  }
  // weeks[0] = This Monday
  // weeks[1] = Last Monday

  // Range for DB Query: From W3 start up to now
  const queryStartDate = weeks[3];

  const whereConditions: Prisma.InfluencerWhereInput[] = [];
  if (filters.regions && filters.regions.length > 0) whereConditions.push({ state: { in: filters.regions } });
  if (filters.state) whereConditions.push({ state: filters.state });
  if (filters.city) whereConditions.push({ city: filters.city });
  if (filters.series) whereConditions.push({ series: filters.series });
  if (filters.search) whereConditions.push({ name: { contains: filters.search, mode: "insensitive" } });
  if (filters.platform) whereConditions.push({ socialProfiles: { some: { platform: filters.platform } } });
  if (filters.situacao === "filiado") whereConditions.push({ isFiliado: true });
  else if (filters.situacao === "pre_candidato") whereConditions.push({ isPreCandidato: true });

  const influencers = await prisma.influencer.findMany({
    where: { AND: whereConditions },
    include: {
      socialProfiles: {
        where: filters.platform ? { platform: filters.platform } : undefined,
        include: {
          metrics: {
            where: { date: { gte: queryStartDate } },
            orderBy: { date: "asc" },
          },
        },
      },
    },
  }) as any[];

  const rows: RankRow[] = influencers.map((inf) => {
    // Helper to find anchored value for a specific week start
    const getWeekValue = (profileMetrics: any[], weekStart: Date): number | null => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      // Filter metrics for this week
      const weekMetrics = profileMetrics.filter(m => {
        const d = new Date(m.date);
        return d >= weekStart && d < weekEnd;
      });

      if (weekMetrics.length === 0) return null; // sem dados

      // 1. Priority: Monday Data
      const mondayMetric = weekMetrics.find(m => {
        const d = new Date(m.date);
        return d.getDate() === weekStart.getDate() && d.getMonth() === weekStart.getMonth();
      });

      if (mondayMetric) return mondayMetric.followersCount;

      // 2. Fallback: Latest data in that week
      return weekMetrics[weekMetrics.length - 1].followersCount;
    };

    let totalW3: number | null = null, totalW2: number | null = null, totalW1: number | null = null, totalW0: number | null = null;

    inf.socialProfiles.forEach((p: any) => {
      const v0 = getWeekValue(p.metrics, weeks[0]);
      const v1 = getWeekValue(p.metrics, weeks[1]);
      const v2 = getWeekValue(p.metrics, weeks[2]);
      const v3 = getWeekValue(p.metrics, weeks[3]);
      if (v0 !== null) totalW0 = (totalW0 ?? 0) + v0;
      if (v1 !== null) totalW1 = (totalW1 ?? 0) + v1;
      if (v2 !== null) totalW2 = (totalW2 ?? 0) + v2;
      if (v3 !== null) totalW3 = (totalW3 ?? 0) + v3;
    });

    const safeW0 = totalW0 ?? 0;
    const safeW1 = totalW1 ?? 0;
    const growthAbs = safeW0 - safeW1;
    const growthPct = safeW1 > 0 ? (growthAbs / safeW1) * 100 : 0;

    return {
      id: inf.id,
      name: inf.name,
      state: inf.state,
      city: inf.city,
      series: inf.series ?? null,
      weeks: { w3: totalW3, w2: totalW2, w1: totalW1, w0: totalW0 },
      growthAbs,
      growthPct,
    };
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.w3 += row.weeks.w3 ?? 0;
      acc.w2 += row.weeks.w2 ?? 0;
      acc.w1 += row.weeks.w1 ?? 0;
      acc.w0 += row.weeks.w0 ?? 0;
      acc.growthAbs += row.growthAbs;
      return acc;
    },
    { w3: 0, w2: 0, w1: 0, w0: 0, growthAbs: 0, growthPct: 0 },
  );
  totals.growthPct = totals.w1 > 0 ? (totals.growthAbs / totals.w1) * 100 : 0;

  const ordered = rows.sort((a, b) => b.growthAbs - a.growthAbs);

  return { data: ordered, totals };
}

async function getMonthlyRank(filters: Required<Pick<ReportFilters, "month" | "year">> & ReportFilters): Promise<RankResult> {
  const monthIndex = filters.month - 1;
  const dateStart = new Date(filters.year, monthIndex, 1);
  const dateEnd = new Date(filters.year, filters.month, 0, 23, 59, 59, 999);

  // Compute week starts within the month (Monday as start). Include weeks that intersect the month.
  const weeksInMonth: Date[] = [];
  let cursor = startOfWeekMonday(dateStart);
  // ensure cursor covers month start
  if (cursor > dateStart) {
    cursor.setDate(cursor.getDate() - 7);
  }
  while (cursor <= dateEnd) {
    weeksInMonth.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  const whereConditions: Prisma.InfluencerWhereInput[] = [];
  if (filters.regions && filters.regions.length > 0) whereConditions.push({ state: { in: filters.regions } });
  if (filters.state) whereConditions.push({ state: filters.state });
  if (filters.city) whereConditions.push({ city: filters.city });
  if (filters.series) whereConditions.push({ series: filters.series });
  if (filters.search) whereConditions.push({ name: { contains: filters.search, mode: "insensitive" } });
  if (filters.platform) whereConditions.push({ socialProfiles: { some: { platform: filters.platform } } });
  if (filters.situacao === "filiado") whereConditions.push({ isFiliado: true });
  else if (filters.situacao === "pre_candidato") whereConditions.push({ isPreCandidato: true });

  const influencers = await prisma.influencer.findMany({
    where: { AND: whereConditions },
    include: {
      socialProfiles: {
        where: filters.platform ? { platform: filters.platform } : undefined,
        include: {
          metrics: {
            where: { date: { gte: weeksInMonth[0], lte: dateEnd } },
            orderBy: { date: "asc" },
          },
        },
      },
    },
  }) as any[];

  const rows: RankRow[] = influencers.map((inf) => {
    // weekStart -> per-profile latest followers
    const perWeekPerProfile = new Map<string, Map<number, { date: Date; followers: number }>>();

    inf.socialProfiles.forEach((p: any) => {
      p.metrics.forEach((m: any) => {
        const mDate = new Date(m.date);
        if (mDate < dateStart || mDate > dateEnd) return;
        const weekStart = startOfWeekMonday(mDate);
        const weekKey = weekStart.toISOString();
        if (!perWeekPerProfile.has(weekKey)) {
          perWeekPerProfile.set(weekKey, new Map());
        }
        const profileMap = perWeekPerProfile.get(weekKey)!;
        const existing = profileMap.get(p.id);
        if (!existing || mDate > existing.date) {
          profileMap.set(p.id, { date: mDate, followers: m.followersCount });
        }
      });
    });

    // Aggregate weeks sum
    const weekSums = weeksInMonth.map((w) => {
      const key = w.toISOString();
      const profileMap = perWeekPerProfile.get(key);
      if (!profileMap) return { weekStart: w, followers: 0 };
      const sum = Array.from(profileMap.values()).reduce((acc, v) => acc + v.followers, 0);
      return { weekStart: w, followers: sum };
    }).filter((w) => w.followers > 0 || true); // keep zero to maintain baseline weeks

    const nonZeroWeeks = weekSums.filter((w) => w.followers > 0);
    const baseline = nonZeroWeeks.length > 0 ? nonZeroWeeks[0].followers : 0;
    const final = nonZeroWeeks.length > 0 ? nonZeroWeeks[nonZeroWeeks.length - 1].followers : 0;
    const growthAbs = final - baseline;
    const growthPct = baseline > 0 ? (growthAbs / baseline) * 100 : 0;

    // map to w3..w0 using last 4 weeks of the month (for display compatibility)
    const lastFour = weekSums.slice(-4).map((w) => w.followers);
    const padded = Array(4 - lastFour.length).fill(0).concat(lastFour);
    const [w3, w2, w1, w0] = padded;

    return {
      id: inf.id,
      name: inf.name,
      state: inf.state,
      city: inf.city,
      series: inf.series ?? null,
      weeks: { w3, w2, w1, w0 },
      growthAbs,
      growthPct,
    };
  });

  let baselineSum = 0;
  const totals = rows.reduce(
    (acc, row) => {
      acc.w3 += row.weeks.w3 ?? 0;
      acc.w2 += row.weeks.w2 ?? 0;
      acc.w1 += row.weeks.w1 ?? 0;
      acc.w0 += row.weeks.w0 ?? 0;
      acc.growthAbs += row.growthAbs;
      const rowBaseline = [row.weeks.w3 ?? 0, row.weeks.w2 ?? 0, row.weeks.w1 ?? 0, row.weeks.w0 ?? 0].find((v) => v > 0) ?? 0;
      baselineSum += rowBaseline;
      return acc;
    },
    { w3: 0, w2: 0, w1: 0, w0: 0, growthAbs: 0, growthPct: 0 },
  );
  totals.growthPct = baselineSum > 0 ? (totals.growthAbs / baselineSum) * 100 : 0;

  const ordered = rows.sort((a, b) => b.growthAbs - a.growthAbs);

  return { data: ordered, totals };
}
