import { Router } from "express";
import { exportExcel, getReportCards } from "../controllers/reportController";
import { authorize } from "../middlewares/authorize";
import { requireAuth } from "../middlewares/requireAuth";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);
reportsRouter.get("/", authorize({ roles: ["admin_global", "admin_regional", "admin_estadual"] }), getReportCards);
reportsRouter.get("/general/export", authorize({ roles: ["admin_global", "admin_regional", "admin_estadual"] }), exportExcel);
