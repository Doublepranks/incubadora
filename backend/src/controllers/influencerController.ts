import { Request, Response } from "express";
import { listInfluencers, getInfluencerById, createInfluencer, updateInfluencer, deleteInfluencer } from "../services/influencerService";
import { prisma } from "../config/prisma";
import { Platform } from "@prisma/client";

type InfluencerBody = {
  name?: string;
  state?: string;
  city?: string;
  avatarUrl?: string | null;
  notes?: string | null;
  profiles?: {
    platform: Platform;
    handle: string;
    url?: string | null;
    externalId?: string | null;
  }[];
};

export async function getInfluencers(req: Request, res: Response) {
  const { search, state, city, platform, periodDays } = req.query;
  const period =
    periodDays === "all"
      ? null
      : periodDays
        ? Number(periodDays)
        : undefined;
  const regions = (req as any).userRegions as string[] | undefined;

  const data = await listInfluencers({
    search: search as string | undefined,
    state: state as string | undefined,
    city: city as string | undefined,
    platform: platform as Platform | undefined,
    periodDays: period,
    regions,
  });

  return res.json({ error: false, data });
}

export async function getInfluencer(req: Request, res: Response) {
  const { id } = req.params;
  const period =
    req.query.periodDays === "all"
      ? null
      : req.query.periodDays
        ? Number(req.query.periodDays)
        : undefined;
  const regions = (req as any).userRegions as string[] | undefined;
  const inf = await getInfluencerById(Number(id), period, regions);
  if (!inf) {
    return res.status(404).json({ error: true, message: "Influencer not found" });
  }
  return res.json({ error: false, data: inf });
}

export async function createInfluencerHandler(req: Request, res: Response) {
  const body = req.body as InfluencerBody;
  if (!body.name || !body.state) {
    return res.status(400).json({ error: true, message: "name and state are required" });
  }

  const regions = (req as any).userRegions as string[] | undefined;
  const state = body.state.toUpperCase();
  if (regions && regions.length > 0 && !regions.includes(state)) {
    return res.status(403).json({ error: true, message: "Acesso restrito à UF" });
  }

  const influencer = await createInfluencer({
    name: body.name,
    state,
    city: body.city ?? "",
    avatarUrl: body.avatarUrl ?? null,
    notes: body.notes ?? null,
    profiles: (body.profiles ?? []).map((p) => ({
      platform: p.platform,
      handle: p.handle,
      url: p.url ?? null,
      externalId: p.externalId ?? null,
    })),
  });

  return res.status(201).json({ error: false, data: influencer });
}

export async function updateInfluencerHandler(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body as InfluencerBody;
  if (!body.name || !body.state) {
    return res.status(400).json({ error: true, message: "name and state are required" });
  }

  const regions = (req as any).userRegions as string[] | undefined;
  const state = body.state.toUpperCase();
  if (regions && regions.length > 0 && !regions.includes(state)) {
    return res.status(403).json({ error: true, message: "Acesso restrito à UF" });
  }

  const updated = await updateInfluencer(
    Number(id),
    {
      name: body.name,
      state,
      city: body.city ?? "",
      avatarUrl: body.avatarUrl ?? null,
      notes: body.notes ?? null,
      profiles: (body.profiles ?? []).map((p) => ({
        platform: p.platform,
        handle: p.handle,
        url: p.url ?? null,
        externalId: p.externalId ?? null,
      })),
    },
    regions,
  );

  if (!updated) {
    return res.status(404).json({ error: true, message: "Influencer not found" });
  }

  return res.json({ error: false, data: updated });
}

export async function deleteInfluencerHandler(req: Request, res: Response) {
  const { id } = req.params;
  const regions = (req as any).userRegions as string[] | undefined;
  const role = req.user?.role;

  // Load influencer with metrics count
  const existing = await prisma.influencer.findFirst({
    where: {
      id: Number(id),
      state: regions && regions.length > 0 ? { in: regions } : undefined,
    },
    include: {
      socialProfiles: {
        include: {
          _count: {
            select: { metrics: true },
          },
        },
      },
    },
  });

  if (!existing) {
    return res.status(404).json({ error: true, message: "Influencer not found" });
  }

  const metricsTotal = existing.socialProfiles.reduce((sum, p) => sum + (p._count?.metrics ?? 0), 0);
  if (metricsTotal > 0 && role !== "admin_global") {
    const admins = await prisma.user.findMany({
      where: { role: "admin_global" },
      select: { email: true, name: true },
    });
    const emails = admins.map((a) => `${a.name} <${a.email}>`).join(", ");
    const friendly = emails
      ? `Este influenciador possui métricas registradas. A exclusão só pode ser feita por um administrador global. Por favor, contate: ${emails}.`
      : "Este influenciador possui métricas registradas. A exclusão só pode ser feita por um administrador global.";
    return res.status(403).json({ error: true, message: friendly });
  }

  await deleteInfluencer(Number(id), regions);
  return res.json({ error: false, message: "Influencer deleted (métricas associadas removidas)." });
}
