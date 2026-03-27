import { Router } from "express";
import {
  listNotificationsHandler,
  createNotificationHandler,
  updateNotificationHandler,
  deleteNotificationHandler,
  getUnreadCountHandler,
  markAllReadHandler,
} from "../controllers/notificationController";
import { requireAuth } from "../middlewares/requireAuth";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { createNotificationBodySchema, updateNotificationBodySchema } from "../schemas/notification";

export const notificationsRouter = Router();

const requireSysAdmin = [requireAuth, authorize({ roles: ["system_admin"] })];

// Any authenticated user
notificationsRouter.get("/", requireAuth, listNotificationsHandler);
notificationsRouter.get("/unread", requireAuth, getUnreadCountHandler);
notificationsRouter.post("/read", requireAuth, markAllReadHandler);

// System admin only
notificationsRouter.post("/", ...requireSysAdmin, validate(createNotificationBodySchema), createNotificationHandler);
notificationsRouter.put("/:id", ...requireSysAdmin, validate(updateNotificationBodySchema), updateNotificationHandler);
notificationsRouter.delete("/:id", ...requireSysAdmin, deleteNotificationHandler);
