import { Request, Response } from "express";
import { listInfluencers, getInfluencerById } from "../services/influencerService";
import { Platform } from "@prisma/client";

export async function getInfluencers(req: Request, res: Response) {
  const { search, state, city, platform, periodDays } = req.query;
  const period = periodDays ? Number(periodDays) : undefined;

  const data = await listInfluencers({
    search: search as string | undefined,
    state: state as string | undefined,
    city: city as string | undefined,
    platform: platform as Platform | undefined,
    periodDays: period,
  });

  return res.json({ error: false, data });
}

export async function getInfluencer(req: Request, res: Response) {
  const { id } = req.params;
  const period = req.query.periodDays ? Number(req.query.periodDays) : undefined;
  const inf = await getInfluencerById(Number(id), period);
  if (!inf) {
    return res.status(404).json({ error: true, message: "Influencer not found" });
  }
  return res.json({ error: false, data: inf });
}
