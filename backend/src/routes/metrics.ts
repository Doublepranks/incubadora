import { Router } from "express";
import {
  getOverviewHandler,
  getPlatformDistributionHandler,
  getStateDistributionHandler,
  getTimelineHandler,
  getTopGrowthHandler,
  addManualMetricHandler,

  getGenderDistributionHandler,
  getGenderByRegionHandler,
} from "../controllers/metricsController";
import { authorize } from "../middlewares/authorize";
import { requireAuth } from "../middlewares/requireAuth";

export const metricsRouter = Router();

metricsRouter.use(requireAuth);
metricsRouter.get("/overview", authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] }), getOverviewHandler);
metricsRouter.get("/top-growth", authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] }), getTopGrowthHandler);
metricsRouter.get("/platform-distribution", authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] }), getPlatformDistributionHandler);
metricsRouter.get("/state-distribution", authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] }), getStateDistributionHandler);
metricsRouter.get("/timeline", authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] }), getTimelineHandler);
metricsRouter.get("/gender-distribution", authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] }), getGenderDistributionHandler);
metricsRouter.get("/gender-by-region", authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] }), getGenderByRegionHandler);
metricsRouter.post("/manual", authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] }), addManualMetricHandler);
