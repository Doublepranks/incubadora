import { Router } from "express";
import { getOverviewHandler, getPlatformDistributionHandler, getStateDistributionHandler, getTimelineHandler, getTopGrowthHandler } from "../controllers/metricsController";

export const metricsRouter = Router();

metricsRouter.get("/overview", getOverviewHandler);
metricsRouter.get("/top-growth", getTopGrowthHandler);
metricsRouter.get("/platform-distribution", getPlatformDistributionHandler);
metricsRouter.get("/state-distribution", getStateDistributionHandler);
metricsRouter.get("/timeline", getTimelineHandler);
