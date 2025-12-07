import { Request, Response } from "express";
import { syncAllProfiles } from "../services/syncService";

export async function runSync(req: Request, res: Response) {
  const handles = Array.isArray(req.body?.handles) ? req.body.handles : undefined;
  const profileIds = Array.isArray(req.body?.profileIds) ? req.body.profileIds : undefined;
  const regions = (req as any).userRegions as string[] | undefined;
  const result = await syncAllProfiles({ handles, profileIds, regions });
  return res.json({ error: false, ...result });
}
