import { Request, Response } from "express";
import { Series } from "@prisma/client";
import { generateExcel, getRankData, getReportData } from "../services/reportService";

const VALID_SERIES: Series[] = ["Elite", "A2", "A3", "Institucional", "Cortes", "Noticias"];

export async function getReportCards(req: Request, res: Response) {
  const { state, city, search, series, month, year } = req.query;
  const regions = (req as any).userRegions as string[] | undefined;

  // Validate filters
  const seriesFilter = series && VALID_SERIES.includes(series as Series) ? (series as Series) : undefined;
  const monthNum = month ? Number(month) : undefined;
  const yearNum = year ? Number(year) : undefined;

  // Validate month (1-12)
  const validMonth = monthNum && monthNum >= 1 && monthNum <= 12 ? monthNum : undefined;
  // Validate year (reasonable range)
  const validYear = yearNum && yearNum >= 2000 && yearNum <= 2100 ? yearNum : undefined;

  const data = await getReportData({
    state: state as string | undefined,
    city: city as string | undefined,
    search: search as string | undefined,
    regions,
    series: seriesFilter,
    month: validMonth,
    year: validYear,
  });
  return res.json({ error: false, data });
}

export async function exportExcel(req: Request, res: Response) {
  const { state, city, search, series, month, year } = req.query;
  const regions = (req as any).userRegions as string[] | undefined;

  const seriesFilter = series && VALID_SERIES.includes(series as Series) ? (series as Series) : undefined;
  const monthNum = month ? Number(month) : undefined;
  const yearNum = year ? Number(year) : undefined;
  const validMonth = monthNum && monthNum >= 1 && monthNum <= 12 ? monthNum : undefined;
  const validYear = yearNum && yearNum >= 2000 && yearNum <= 2100 ? yearNum : undefined;

  const buffer = await generateExcel({
    state: state as string | undefined,
    city: city as string | undefined,
    search: search as string | undefined,
    regions,
    series: seriesFilter,
    month: validMonth,
    year: validYear,
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="relatorio.xlsx"');
  return res.send(buffer);
}

export async function getRank(req: Request, res: Response) {
  const { state, city, search, periodWeeks, series } = req.query;
  const regions = (req as any).userRegions as string[] | undefined;
  const period = periodWeeks ? Number(periodWeeks) : 4;

  const seriesFilter = series && VALID_SERIES.includes(series as Series) ? (series as Series) : undefined;

  const result = await getRankData(
    {
      state: state as string | undefined,
      city: city as string | undefined,
      search: search as string | undefined,
      regions,
      series: seriesFilter,
    },
    Number.isFinite(period) && period > 0 ? period : 4
  );
  return res.json({ error: false, data: result.data, totals: result.totals });
}
