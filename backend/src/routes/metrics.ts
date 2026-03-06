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
import { validate } from "../middlewares/validate";
import { addMetricSchema } from "../schemas/metric";

export const metricsRouter = Router();

const allAdmins = authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] });

metricsRouter.use(requireAuth);
metricsRouter.get("/overview", allAdmins, getOverviewHandler);
metricsRouter.get("/top-growth", allAdmins, getTopGrowthHandler);
metricsRouter.get("/platform-distribution", allAdmins, getPlatformDistributionHandler);
metricsRouter.get("/state-distribution", allAdmins, getStateDistributionHandler);
metricsRouter.get("/timeline", allAdmins, getTimelineHandler);
metricsRouter.get("/gender-distribution", allAdmins, getGenderDistributionHandler);
metricsRouter.get("/gender-by-region", allAdmins, getGenderByRegionHandler);
metricsRouter.post("/manual", allAdmins, validate(addMetricSchema), addManualMetricHandler);

