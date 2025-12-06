import { Request, Response } from "express";
import { generateExcel, getReportData } from "../services/reportService";

export async function getReportCards(req: Request, res: Response) {
  const { state, city, search } = req.query;
  const data = await getReportData({
    state: state as string | undefined,
    city: city as string | undefined,
    search: search as string | undefined,
  });
  return res.json({ error: false, data });
}

export async function exportExcel(req: Request, res: Response) {
  const { state, city, search } = req.query;
  const buffer = await generateExcel({
    state: state as string | undefined,
    city: city as string | undefined,
    search: search as string | undefined,
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="relatorio.xlsx"');
  return res.send(buffer);
}
