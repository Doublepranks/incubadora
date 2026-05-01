import { Request, Response } from "express";
import { Platform, Series } from "@prisma/client";
import { generateExcel, getRankData, getReportData } from "../services/reportService";

const VALID_SERIES: Series[] = ["Elite", "A2", "A3", "Institucional", "Cortes", "Noticias"];

export async function getReportCards(req: Request, res: Response) {
  const { state, city, search, series, month, year, platform, limit, page, situacao } = req.query;
  const regions = (req as any).userRegions as string[] | undefined;

  // Validate filters
  const seriesProvided = typeof series !== "undefined";
  if (seriesProvided && !VALID_SERIES.includes(series as Series)) {
    return res.status(400).json({ error: true, message: "Parâmetro 'series' inválido" });
  }
  const seriesFilter = seriesProvided ? (series as Series) : undefined;

  const monthNum = typeof month !== "undefined" ? Number(month) : undefined;
  if (monthNum !== undefined && (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12)) {
    return res.status(400).json({ error: true, message: "Parâmetro 'month' deve estar entre 1 e 12" });
  }

  const yearNum = typeof year !== "undefined" ? Number(year) : undefined;
  if (yearNum !== undefined && (!Number.isFinite(yearNum) || yearNum < 2000 || yearNum > 2100)) {
    return res.status(400).json({ error: true, message: "Parâmetro 'year' deve estar entre 2000 e 2100" });
  }

  // If month provided without year, default to current year to avoid falling back to 28-day window
  const computedYear = monthNum ? yearNum ?? new Date().getFullYear() : yearNum;

  const limitNum = typeof limit !== "undefined" ? Number(limit) : undefined;
  const pageNum = typeof page !== "undefined" ? Number(page) : undefined;
  const parsedLimit = limitNum !== undefined && Number.isFinite(limitNum) && limitNum > 0 ? Math.min(Math.floor(limitNum), 100) : 10;
  const parsedPage = pageNum !== undefined && Number.isFinite(pageNum) && pageNum > 0 ? Math.floor(pageNum) : 1;
  const offset = (parsedPage - 1) * parsedLimit;

  const { items, total } = await getReportData(
    {
      state: state as string | undefined,
      city: city as string | undefined,
      search: search as string | undefined,
      regions,
      series: seriesFilter,
      month: monthNum,
      year: computedYear,
      platform: platform as Platform | undefined,
      situacao: situacao as string | undefined,
    },
    { pagination: { limit: parsedLimit, offset } },
  );

  return res.json({
    error: false,
    data: items,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      hasMore: offset + items.length < total,
    },
  });
}

export async function exportExcel(req: Request, res: Response) {
  const { state, city, search, series, month, year, platform, situacao } = req.query;
  const regions = (req as any).userRegions as string[] | undefined;

  const seriesProvided = typeof series !== "undefined";
  if (seriesProvided && !VALID_SERIES.includes(series as Series)) {
    return res.status(400).json({ error: true, message: "Parâmetro 'series' inválido" });
  }
  const seriesFilter = seriesProvided ? (series as Series) : undefined;

  const monthNum = typeof month !== "undefined" ? Number(month) : undefined;
  if (monthNum !== undefined && (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12)) {
    return res.status(400).json({ error: true, message: "Parâmetro 'month' deve estar entre 1 e 12" });
  }

  const yearNum = typeof year !== "undefined" ? Number(year) : undefined;
  if (yearNum !== undefined && (!Number.isFinite(yearNum) || yearNum < 2000 || yearNum > 2100)) {
    return res.status(400).json({ error: true, message: "Parâmetro 'year' deve estar entre 2000 e 2100" });
  }

  const computedYear = monthNum ? yearNum ?? new Date().getFullYear() : yearNum;

  const buffer = await generateExcel({
    state: state as string | undefined,
    city: city as string | undefined,
    search: search as string | undefined,
    regions,
    series: seriesFilter,
    month: monthNum,
    year: computedYear,
    platform: platform as Platform | undefined,
    situacao: situacao as string | undefined,
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="relatorio.xlsx"');
  return res.send(buffer);
}

export async function getRank(req: Request, res: Response) {
  const { state, city, search, periodWeeks, series, mode, month, year, platform, situacao } = req.query;
  const regions = (req as any).userRegions as string[] | undefined;
  let monthNum = month ? Number(month) : undefined;
  let yearNum = year ? Number(year) : undefined;

  const seriesProvided = typeof series !== "undefined";
  if (seriesProvided && !VALID_SERIES.includes(series as Series)) {
    return res.status(400).json({ error: true, message: "Parâmetro 'series' inválido" });
  }
  const seriesFilter = seriesProvided ? (series as Series) : undefined;

  const requestedMode = mode === "monthly" || (monthNum && yearNum) ? "monthly" : "weekly";

  // Default to current month/year if mode is monthly but parameters are missing
  if (requestedMode === "monthly") {
    const now = new Date();
    if (!monthNum) monthNum = now.getMonth() + 1;
    if (!yearNum) yearNum = now.getFullYear();

    // Validate after defaulting
    if (monthNum < 1 || monthNum > 12 || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ error: true, message: "Parâmetros de mês/ano inválidos para ranking mensal" });
    }
  }

  const result = await getRankData(
    {
      state: state as string | undefined,
      city: city as string | undefined,
      search: search as string | undefined,
      regions,
      series: seriesFilter,
      month: monthNum,
      year: yearNum,
      platform: platform as Platform | undefined,
      situacao: situacao as string | undefined,
    },
    { mode: requestedMode },
  );
  return res.json({ error: false, data: result.data, totals: result.totals, mode: requestedMode });
}
