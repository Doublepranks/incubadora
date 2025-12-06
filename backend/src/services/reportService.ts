import ExcelJS from "exceljs";
import { Platform } from "@prisma/client";
import { prisma } from "../config/prisma";
import { daysAgo, startOfWeekMonday } from "./dateService";

type ReportFilters = {
  state?: string;
  city?: string;
  search?: string;
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
