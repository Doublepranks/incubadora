import { Router } from "express";
import { Request, Response } from "express";
import { getLogs, triggerRetryNow, triggerSyncNow, triggerStateSyncNow } from "../controllers/adminController";
import { logSystem } from "../services/logService";
import { LogLevel } from "@prisma/client";
import { authorize } from "../middlewares/authorize";
import { requireAuth } from "../middlewares/requireAuth";
import { validate } from "../middlewares/validate";
import { stateSyncSchema, retrySchema, clientErrorSchema } from "../schemas/admin";

export const adminRouter = Router();

// Apenas system_admin pode acessar /sysadmin e orquestrar execuções manuais
const requireSysAdmin = [requireAuth, authorize({ roles: ["system_admin"] })];

adminRouter.post("/sync/run", ...requireSysAdmin, triggerSyncNow);
adminRouter.post("/sync/state", ...requireSysAdmin, validate(stateSyncSchema), triggerStateSyncNow);
adminRouter.post("/sync/retry", ...requireSysAdmin, validate(retrySchema), triggerRetryNow);
adminRouter.get("/logs", ...requireSysAdmin, getLogs);

// Client-side error reporting — accessible by any authenticated user
adminRouter.post("/client-error", requireAuth, validate(clientErrorSchema), async (req: Request, res: Response) => {
    const { message, stack, componentStack, url, userAgent } = req.body;
    const userId = (req as any).user?.id ?? null;

    await logSystem({
        level: LogLevel.error,
        message: `[Client Error] ${message}`,
        meta: {
            stack: stack || null,
            componentStack: componentStack || null,
            url: url || null,
            userAgent: userAgent || null,
            userId,
        },
        userId,
    });

    return res.json({ error: false });
});

