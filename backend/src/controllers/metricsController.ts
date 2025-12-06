import { Request, Response } from "express";
import { Platform } from "@prisma/client";
import { getFollowersTimeline, getOverview, getPlatformDistribution, getStateDistribution, getTopGrowth } from "../services/metricsService";

export async function getOverviewHandler(req: Request, res: Response) {
  const { state, city, platform, periodDays } = req.query;
  const period = periodDays ? Number(periodDays) : undefined;
  const data = await getOverview({
    state: state as string | undefined,
    city: city as string | undefined,
    platform: platform as Platform | undefined,
    periodDays: period,
  });
  return res.json({ error: false, data });
}

export async function getTopGrowthHandler(req: Request, res: Response) {
  const { state, city, platform, periodDays, limit } = req.query;
  const period = periodDays ? Number(periodDays) : undefined;
  const lim = limit ? Number(limit) : 10;
  const data = await getTopGrowth(
    {
      state: state as string | undefined,
      city: city as string | undefined,
      platform: platform as Platform | undefined,
      periodDays: period,
    },
    lim,
  );
  return res.json({ error: false, data });
}

export async function getPlatformDistributionHandler(_req: Request, res: Response) {
  const data = await getPlatformDistribution();
  return res.json({ error: false, data });
}

export async function getStateDistributionHandler(req: Request, res: Response) {
  const { state, city, platform } = req.query;
  const data = await getStateDistribution({
    state: state as string | undefined,
    city: city as string | undefined,
    platform: platform as Platform | undefined,
  });
  return res.json({ error: false, data });
}

export async function getTimelineHandler(req: Request, res: Response) {
  const { state, city, platform, periodDays } = req.query;
  const period = periodDays ? Number(periodDays) : undefined;
  const data = await getFollowersTimeline({
    state: state as string | undefined,
    city: city as string | undefined,
    platform: platform as Platform | undefined,
    periodDays: period,
  });
  return res.json({ error: false, data });
}
