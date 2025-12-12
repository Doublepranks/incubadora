import { Router } from "express";
import { getLogs, triggerRetryNow, triggerSyncNow } from "../controllers/adminController";
import { authorize } from "../middlewares/authorize";
import { requireAuth } from "../middlewares/requireAuth";

export const adminRouter = Router();

// Apenas system_admin pode acessar /sysadmin e orquestrar execuções manuais
const requireSysAdmin = [requireAuth, authorize({ roles: ["system_admin"] })];

adminRouter.post("/sync/run", ...requireSysAdmin, triggerSyncNow);
adminRouter.post("/sync/retry", ...requireSysAdmin, triggerRetryNow);
adminRouter.get("/logs", ...requireSysAdmin, getLogs);
