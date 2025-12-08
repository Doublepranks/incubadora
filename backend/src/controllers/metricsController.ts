import { Request, Response } from "express";
import { Platform } from "@prisma/client";
import { addManualMetric, getFollowersTimeline, getOverview, getPlatformDistribution, getStateDistribution, getTopGrowth } from "../services/metricsService";

export async function getOverviewHandler(req: Request, res: Response) {
  const { state, city, platform, periodDays } = req.query;
  const period =
    periodDays === "all"
      ? null
      : periodDays
        ? Number(periodDays)
        : undefined;
  const regions = (req as any).userRegions as string[] | undefined;
  const data = await getOverview({
    state: state as string | undefined,
    city: city as string | undefined,
    platform: platform as Platform | undefined,
    periodDays: period,
    regions,
  });
  return res.json({ error: false, data });
}

export async function getTopGrowthHandler(req: Request, res: Response) {
  const { state, city, platform, periodDays, limit } = req.query;
  const period =
    periodDays === "all"
      ? null
      : periodDays
        ? Number(periodDays)
        : undefined;
  const regions = (req as any).userRegions as string[] | undefined;
  const lim = limit ? Number(limit) : 10;
  const data = await getTopGrowth(
    {
      state: state as string | undefined,
      city: city as string | undefined,
      platform: platform as Platform | undefined,
      periodDays: period,
      regions,
    },
    lim,
  );
  return res.json({ error: false, data });
}

export async function getPlatformDistributionHandler(_req: Request, res: Response) {
  const { state, city, platform } = _req.query;
  const regions = (_req as any).userRegions as string[] | undefined;
  const data = await getPlatformDistribution({
    state: state as string | undefined,
    city: city as string | undefined,
    platform: platform as Platform | undefined,
    regions,
  });
  return res.json({ error: false, data });
}

export async function getStateDistributionHandler(req: Request, res: Response) {
  const { state, city, platform } = req.query;
  const regions = (req as any).userRegions as string[] | undefined;
  const data = await getStateDistribution({
    state: state as string | undefined,
    city: city as string | undefined,
    platform: platform as Platform | undefined,
    regions,
  });
  return res.json({ error: false, data });
}

export async function getTimelineHandler(req: Request, res: Response) {
  const { state, city, platform, periodDays } = req.query;
  const period =
    periodDays === "all"
      ? null
      : periodDays
        ? Number(periodDays)
        : undefined;
  const regions = (req as any).userRegions as string[] | undefined;
  const data = await getFollowersTimeline({
    state: state as string | undefined,
    city: city as string | undefined,
    platform: platform as Platform | undefined,
    periodDays: period,
    regions,
  });
  return res.json({ error: false, data });
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
