import { Router } from "express";
import { runSync } from "../controllers/syncController";
import { authorize } from "../middlewares/authorize";
import { requireAuth } from "../middlewares/requireAuth";

export const syncRouter = Router();

syncRouter.post("/run", requireAuth, authorize({ roles: ["admin_global", "admin_regional", "admin_estadual"] }), runSync);
