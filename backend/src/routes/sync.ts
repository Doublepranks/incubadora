import { Router } from "express";
import { runSync } from "../controllers/syncController";
import { authorize } from "../middlewares/authorize";
import { requireAuth } from "../middlewares/requireAuth";

export const syncRouter = Router();

// Execução manual de sync somente por system_admin
syncRouter.post("/run", requireAuth, authorize({ roles: ["system_admin"] }), runSync);
