import { Request, Response } from "express";
import { Platform, Series } from "@prisma/client";
import { addManualMetric, getFollowersTimeline, getGenderByRegion, getGenderDistribution, getOverview, getPlatformDistribution, getStateDistribution, getTopGrowth } from "../services/metricsService";

const VALID_SERIES: Series[] = ["Elite", "A2", "A3", "Institucional", "Cortes", "Noticias"];

export async function getOverviewHandler(req: Request, res: Response) {
  try {
    const { state, city, platform, periodDays, series } = req.query;
    const period =
      periodDays === "all"
        ? null
        : periodDays
          ? Number(periodDays)
          : undefined;
    const regions = (req as any).userRegions as string[] | undefined;
    const seriesFilter = series && VALID_SERIES.includes(series as Series) ? (series as Series) : undefined;

    const data = await getOverview({
      state: state as string | undefined,
      city: city as string | undefined,
      platform: platform as Platform | undefined,
      periodDays: period,
      regions,
      series: seriesFilter,
    });
    return res.json({ error: false, data });
  } catch (err) {
    console.error("Error in getOverviewHandler:", err);
    return res.status(500).json({ error: true, message: "Failed to fetch overview" });
  }
}

export async function getTopGrowthHandler(req: Request, res: Response) {
  try {
    const { state, city, platform, periodDays, limit, series } = req.query;
    const period =
      periodDays === "all"
        ? null
        : periodDays
          ? Number(periodDays)
          : undefined;
    const regions = (req as any).userRegions as string[] | undefined;
    const lim = limit ? Number(limit) : 10;
    const seriesFilter = series && VALID_SERIES.includes(series as Series) ? (series as Series) : undefined;

    const data = await getTopGrowth(
      {
        state: state as string | undefined,
        city: city as string | undefined,
        platform: platform as Platform | undefined,
        periodDays: period,
        regions,
        series: seriesFilter,
      },
      lim,
    );
    return res.json({ error: false, data });
  } catch (err) {
    console.error("Error in getTopGrowthHandler:", err);
    return res.status(500).json({ error: true, message: "Failed to fetch top growth" });
  }
}

export async function getPlatformDistributionHandler(_req: Request, res: Response) {
  try {
    const { state, city, platform, series } = _req.query;
    const regions = (_req as any).userRegions as string[] | undefined;
    const seriesFilter = series && VALID_SERIES.includes(series as Series) ? (series as Series) : undefined;

    const data = await getPlatformDistribution({
      state: state as string | undefined,
      city: city as string | undefined,
      platform: platform as Platform | undefined,
      regions,
      series: seriesFilter,
    });
    return res.json({ error: false, data });
  } catch (err) {
    console.error("Error in getPlatformDistributionHandler:", err);
    return res.status(500).json({ error: true, message: "Failed to fetch platform distribution" });
  }
}

export async function getStateDistributionHandler(req: Request, res: Response) {
  try {
    const { state, city, platform, series } = req.query;
    const regions = (req as any).userRegions as string[] | undefined;
    const seriesFilter = series && VALID_SERIES.includes(series as Series) ? (series as Series) : undefined;

    const data = await getStateDistribution({
      state: state as string | undefined,
      city: city as string | undefined,
      platform: platform as Platform | undefined,
      regions,
      series: seriesFilter,
    });
    return res.json({ error: false, data });
  } catch (err) {
    console.error("Error in getStateDistributionHandler:", err);
    return res.status(500).json({ error: true, message: "Failed to fetch state distribution" });
  }
}

export async function getTimelineHandler(req: Request, res: Response) {
  try {
    const { state, city, platform, periodDays, series } = req.query;
    const period =
      periodDays === "all"
        ? null
        : periodDays
          ? Number(periodDays)
          : undefined;
    const regions = (req as any).userRegions as string[] | undefined;
    const seriesFilter = series && VALID_SERIES.includes(series as Series) ? (series as Series) : undefined;

    const data = await getFollowersTimeline({
      state: state as string | undefined,
      city: city as string | undefined,
      platform: platform as Platform | undefined,
      periodDays: period,
      regions,
      series: seriesFilter,
    });
    return res.json({ error: false, data });
  } catch (err) {
    console.error("Error in getTimelineHandler:", err);
    return res.status(500).json({ error: true, message: "Failed to fetch timeline" });
  }
}

export async function addManualMetricHandler(req: Request, res: Response) {
  const regions = (req as any).userRegions as string[] | undefined;
  const { socialProfileId, influencerId, platform, date, followersCount, postsCount } = req.body;

  if (!platform) {
    return res.status(400).json({ error: true, message: "platform is required" });
  }

  if (!date || followersCount === undefined || postsCount === undefined) {
    return res.status(400).json({ error: true, message: "date, followersCount and postsCount are required" });
  }

  try {
    const metric = await addManualMetric(
      {
        socialProfileId: socialProfileId ? Number(socialProfileId) : undefined,
        influencerId: influencerId ? Number(influencerId) : undefined,
        platform: platform as Platform,
        date,
        followersCount: Number(followersCount),
        postsCount: Number(postsCount),
      },
      regions,
    );
    return res.status(201).json({ error: false, data: metric });
  } catch (err: any) {
    return res.status(400).json({ error: true, message: err?.message ?? "Failed to add manual metric" });
  }
}

export async function getGenderDistributionHandler(req: Request, res: Response) {
  try {
    const { state, city, series } = req.query;
    const regions = (req as any).userRegions as string[] | undefined;
    const seriesFilter = series && VALID_SERIES.includes(series as Series) ? (series as Series) : undefined;

    const data = await getGenderDistribution({
      state: state as string | undefined,
      city: city as string | undefined,
      series: seriesFilter,
      regions,
    });
    return res.json({ error: false, data });
  } catch (err) {
    console.error("Error in getGenderDistributionHandler:", err);
    return res.status(500).json({ error: true, message: "Failed to fetch gender distribution" });
  }
}

export async function getGenderByRegionHandler(req: Request, res: Response) {
  try {
    const { state, city, series } = req.query;
    const regions = (req as any).userRegions as string[] | undefined;
    const seriesFilter = series && VALID_SERIES.includes(series as Series) ? (series as Series) : undefined;

    const data = await getGenderByRegion({
      state: state as string | undefined,
      city: city as string | undefined,
      series: seriesFilter,
      regions,
    });
    return res.json({ error: false, data });
  } catch (err) {
    console.error("Error in getGenderByRegionHandler:", err);
    return res.status(500).json({ error: true, message: "Failed to fetch gender by region" });
  }
}
