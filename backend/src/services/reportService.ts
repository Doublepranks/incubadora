import ExcelJS from "exceljs";
import { Platform } from "@prisma/client";
import { prisma } from "../config/prisma";
import { daysAgo, startOfWeekMonday, getLastNWeekStarts } from "./dateService";

type ReportFilters = {
  state?: string;
  city?: string;
  search?: string;
  regions?: string[];
};

type WeeklyData = {
  platform: Platform;
  weekStart: Date;
  followers: number;
};

export async function getReportData(filters: ReportFilters) {
  const influencers = await prisma.influencer.findMany({
    where: {
      AND: [
        filters.regions && filters.regions.length > 0 ? { state: { in: filters.regions } } : {},
        filters.state ? { state: filters.state } : {},
        filters.city ? { city: filters.city } : {},
        filters.search
          ? {
              name: { contains: filters.search, mode: "insensitive" },
            }
          : {},
      ],
    },
    include: {
      socialProfiles: {
        include: {
          metrics: {
            where: { date: { gte: daysAgo(28) } },
            orderBy: { date: "asc" },
          },
        },
      },
    },
  });

  return influencers.map((inf) => {
    const weekly: WeeklyData[] = [];

    inf.socialProfiles.forEach((profile) => {
      profile.metrics.forEach((m) => {
        const weekStart = startOfWeekMonday(new Date(m.date));
        weekly.push({
          platform: profile.platform,
          weekStart,
          followers: m.followersCount,
        });
      });
    });

    const grouped = groupWeekly(weekly);
    const totalFollowers = inf.socialProfiles.reduce((sum, p) => {
      const last = p.metrics[p.metrics.length - 1];
      return sum + (last ? last.followersCount : 0);
    }, 0);

    return {
      id: inf.id,
      name: inf.name,
      state: inf.state,
      city: inf.city,
      avatarUrl: inf.avatarUrl,
      platforms: inf.socialProfiles.map((p) => p.platform),
      totalFollowers,
      weekly: grouped,
    };
  });
}

function groupWeekly(entries: WeeklyData[]) {
  const map = new Map<string, { platform: Platform; weekStart: Date; followers: number }>();
  entries.forEach((e) => {
    const key = `${e.platform}-${e.weekStart.toISOString()}`;
    const current = map.get(key);
    if (!current || e.weekStart > current.weekStart) {
      map.set(key, e);
    }
  });
  return Array.from(map.values());
}

export async function generateExcel(filters: ReportFilters) {
  const data = await getReportData(filters);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relatório");

  sheet.columns = [
    { header: "Nome", key: "name", width: 25 },
    { header: "Estado", key: "state", width: 10 },
    { header: "Município", key: "city", width: 20 },
    { header: "Instagram", key: "instagram", width: 15 },
    { header: "X", key: "x", width: 10 },
    { header: "YouTube", key: "youtube", width: 15 },
    { header: "Kwai", key: "kwai", width: 12 },
    { header: "TikTok", key: "tiktok", width: 12 },
    { header: "Total Seguidores", key: "total", width: 18 },
  ];

  data.forEach((inf) => {
    const latestByPlatform = new Map<Platform, number>();
    inf.weekly.forEach((w) => {
      const current = latestByPlatform.get(w.platform);
      if (current === undefined || w.weekStart > new Date(current)) {
        latestByPlatform.set(w.platform, w.followers);
      }
    });

    sheet.addRow({
      name: inf.name,
      state: inf.state,
      city: inf.city,
      instagram: latestByPlatform.get("instagram") ?? 0,
      x: latestByPlatform.get("x") ?? 0,
      youtube: latestByPlatform.get("youtube") ?? 0,
      kwai: latestByPlatform.get("kwai") ?? 0,
      tiktok: latestByPlatform.get("tiktok") ?? 0,
      total: inf.totalFollowers,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

type RankRow = {
  id: string;
  name: string;
  state: string;
  city: string | null;
  weeks: { w3: number; w2: number; w1: number; w0: number };
  growthAbs: number;
  growthPct: number;
};

type RankResult = {
  data: RankRow[];
  totals: { w3: number; w2: number; w1: number; w0: number; growthAbs: number; growthPct: number };
};

export async function getRankData(filters: ReportFilters, periodWeeks = 4): Promise<RankResult> {
  const weekStarts = getLastNWeekStarts(periodWeeks);
  const oldest = weekStarts[0];
  const influencers = await prisma.influencer.findMany({
    where: {
      AND: [
        filters.regions && filters.regions.length > 0 ? { state: { in: filters.regions } } : {},
        filters.state ? { state: filters.state } : {},
        filters.city ? { city: filters.city } : {},
        filters.search
          ? {
              name: { contains: filters.search, mode: "insensitive" },
            }
          : {},
      ],
    },
    include: {
      socialProfiles: {
        include: {
          metrics: {
            where: { date: { gte: oldest } },
            orderBy: { date: "asc" },
          },
        },
      },
    },
  });

  const weekKeys = weekStarts.map((w) => w.toISOString());

  const rows: RankRow[] = influencers.map((inf) => {
    const profileWeekLatest = new Map<string, { date: Date; followers: number }>();

    inf.socialProfiles.forEach((p) => {
      p.metrics.forEach((m) => {
        const weekStart = startOfWeekMonday(new Date(m.date));
        const key = weekStart.toISOString();
        if (!weekKeys.includes(key)) return;
        const existing = profileWeekLatest.get(key);
        if (!existing || new Date(m.date) > existing.date) {
          profileWeekLatest.set(key, { date: new Date(m.date), followers: m.followersCount });
        }
      });
    });

    const w3 = profileWeekLatest.get(weekKeys[0])?.followers ?? 0;
    const w2 = profileWeekLatest.get(weekKeys[1])?.followers ?? 0;
    const w1 = profileWeekLatest.get(weekKeys[2])?.followers ?? 0;
    const w0 = profileWeekLatest.get(weekKeys[3])?.followers ?? 0;
    const growthAbs = w0 - w3;
    const growthPct = w3 > 0 ? (growthAbs / w3) * 100 : 0;

    return {
      id: inf.id,
      name: inf.name,
      state: inf.state,
      city: inf.city,
      weeks: { w3, w2, w1, w0 },
      growthAbs,
      growthPct,
    };
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.w3 += row.weeks.w3;
      acc.w2 += row.weeks.w2;
      acc.w1 += row.weeks.w1;
      acc.w0 += row.weeks.w0;
      acc.growthAbs += row.growthAbs;
      return acc;
    },
    { w3: 0, w2: 0, w1: 0, w0: 0, growthAbs: 0, growthPct: 0 }
  );
  totals.growthPct = totals.w3 > 0 ? (totals.growthAbs / totals.w3) * 100 : 0;

  const ordered = rows.sort((a, b) => b.weeks.w0 - a.weeks.w0);

  return { data: ordered, totals };
}
