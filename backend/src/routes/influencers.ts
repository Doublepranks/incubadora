import { Router } from "express";
import {
  getInfluencers,
  getInfluencer,
  createInfluencerHandler,
  updateInfluencerHandler,
  deleteInfluencerHandler,
} from "../controllers/influencerController";
import { authorize } from "../middlewares/authorize";
import { requireAuth } from "../middlewares/requireAuth";

export const influencersRouter = Router();

influencersRouter.use(requireAuth);
influencersRouter.get("/", authorize({ roles: ["admin_global", "admin_regional", "admin_estadual"] }), getInfluencers);
influencersRouter.post("/", authorize({ roles: ["admin_global", "admin_regional", "admin_estadual"] }), createInfluencerHandler);
influencersRouter.get("/:id", authorize({ roles: ["admin_global", "admin_regional", "admin_estadual"] }), getInfluencer);
influencersRouter.put("/:id", authorize({ roles: ["admin_global", "admin_regional", "admin_estadual"] }), updateInfluencerHandler);
influencersRouter.delete("/:id", authorize({ roles: ["admin_global", "admin_regional", "admin_estadual"] }), deleteInfluencerHandler);
