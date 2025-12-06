import { Router } from "express";
import { exportExcel, getReportCards } from "../controllers/reportController";

export const reportsRouter = Router();

reportsRouter.get("/", getReportCards);
reportsRouter.get("/general/export", exportExcel);
