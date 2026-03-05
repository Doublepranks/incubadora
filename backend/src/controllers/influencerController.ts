import { Request, Response } from "express";
import { listInfluencers, listInfluencerSummary, getInfluencerById, createInfluencer, updateInfluencer, deleteInfluencer } from "../services/influencerService";
import { prisma } from "../config/prisma";
import { Platform, Series, Sex } from "@prisma/client";

const VALID_SERIES: Series[] = ["Elite", "A2", "A3", "Institucional", "Cortes", "Noticias"];
const VALID_SEX: Sex[] = ["masculino", "feminino"];

type InfluencerBody = {
  name?: string;
  state?: string;
  city?: string;
  avatarUrl?: string | null;
  notes?: string | null;
  series?: Series | null;
  sex?: Sex | null;
  profiles?: {
    platform: Platform;
    handle: string;
    url?: string | null;
    externalId?: string | null;
  }[];
};

export async function getInfluencers(req: Request, res: Response) {
  const { search, state, city, platform, periodDays, series, page, limit } = req.query;
  const period =
    periodDays === "all"
      ? null
      : periodDays
        ? Number(periodDays)
        : undefined;
  const regions = (req as any).userRegions as string[] | undefined;

  // Validate series if provided
  const seriesFilter = series && VALID_SERIES.includes(series as Series) ? (series as Series) : undefined;

  // Pagination — only apply when page or limit are explicitly provided
  const wantsPagination = page !== undefined || limit !== undefined;
  let paginationOpts: { limit: number; offset: number } | undefined;
  let pageNum = 1;
  let limitNum = 0;

  if (wantsPagination) {
    pageNum = Math.max(1, Number(page) || 1);
    limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    paginationOpts = { limit: limitNum, offset: (pageNum - 1) * limitNum };
  }

  const { items, total } = await listInfluencers({
    search: search as string | undefined,
    state: state as string | undefined,
    city: city as string | undefined,
    platform: platform as Platform | undefined,
    periodDays: period,
    regions,
    series: seriesFilter,
    sex: req.query.sex as Sex | undefined,
  }, {
    pagination: paginationOpts
  });

  return res.json({
    error: false,
    data: items,
    pagination: { total, page: pageNum, limit: wantsPagination ? limitNum : total }
  });
}

export async function getInfluencerSummary(req: Request, res: Response) {
  const { search, state, city, limit } = req.query;
  const regions = (req as any).userRegions as string[] | undefined;

  const limitNum = limit ? Math.min(200, Math.max(1, Number(limit) || 20)) : undefined;

  const items = await listInfluencerSummary({
    search: search as string | undefined,
    state: state as string | undefined,
    city: city as string | undefined,
    regions,
  }, {
    limit: limitNum,
  });

  return res.json({ error: false, data: items });
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

  const profiles = body.profiles ?? [];
  const hasValidProfile = profiles.some((p) => p.handle || p.url);
  if (!hasValidProfile) {
    return res.status(400).json({
      error: true,
      message: "É necessário informar pelo menos um perfil de rede social (handle ou link).",
    });
  }

  const regions = (req as any).userRegions as string[] | undefined;
  const state = body.state.toUpperCase();
  if (regions && regions.length > 0 && !regions.includes(state)) {
    return res.status(403).json({ error: true, message: "Acesso restrito à UF" });
  }

  // Validate series if provided
  const seriesValue = body.series && VALID_SERIES.includes(body.series) ? body.series : null;
  const sexValue = body.sex && VALID_SEX.includes(body.sex) ? body.sex : null;

  const influencer = await createInfluencer({
    name: body.name,
    state,
    city: body.city ?? "",
    avatarUrl: body.avatarUrl ?? null,
    notes: body.notes ?? null,
    series: seriesValue,
    sex: sexValue,
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

  // Validate series if provided
  const seriesValue = body.series && VALID_SERIES.includes(body.series) ? body.series : null;
  const sexValue = body.sex && VALID_SEX.includes(body.sex) ? body.sex : null;

  const updated = await updateInfluencer(
    Number(id),
    {
      name: body.name,
      state,
      city: body.city ?? "",
      avatarUrl: body.avatarUrl ?? null,
      notes: body.notes ?? null,
      series: seriesValue,
      sex: sexValue,
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
  if (metricsTotal > 0 && role !== "admin_global" && role !== "system_admin") {
    return res.status(403).json({
      error: true,
      message: "Este influenciador possui métricas registradas. A exclusão só pode ser feita por um administrador global.",
      contactUrl: "https://wa.me/559192379947",
      contactLabel: "Falar com administrador via WhatsApp",
    });
  }

  await deleteInfluencer(Number(id), regions);
  return res.json({ error: false, message: "Influencer deleted (métricas associadas removidas)." });
}
