import { Router } from "express";
import { healthRouter } from "./health";
import { authRouter } from "./auth";
import { influencersRouter } from "./influencers";
import { geoRouter } from "./geo";
import { metricsRouter } from "./metrics";
import { reportsRouter } from "./reports";
import { syncRouter } from "./sync";
import { usersRouter } from "./users";
import { adminRouter } from "./admin";

export const routes = Router();

routes.use("/health", healthRouter);
routes.use("/auth", authRouter);
routes.use("/influencers", influencersRouter);
routes.use("/geo", geoRouter);
routes.use("/metrics", metricsRouter);
routes.use("/reports", reportsRouter);
routes.use("/sync", syncRouter);
routes.use("/users", usersRouter);
routes.use("/admin", adminRouter);
