import { Router } from "express";
import {
  getInfluencers,
  getInfluencerSummary,
  getInfluencer,
  createInfluencerHandler,
  updateInfluencerHandler,
  deleteInfluencerHandler,
} from "../controllers/influencerController";
import { getNotesHandler, addNoteHandler } from "../controllers/NotesController";
import { getInfluencerGoalsHandler } from "../controllers/goalsController";
import { authorize } from "../middlewares/authorize";
import { requireAuth } from "../middlewares/requireAuth";

export const influencersRouter = Router();

influencersRouter.use(requireAuth);
influencersRouter.get("/", authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] }), getInfluencers);
influencersRouter.get("/summary", authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] }), getInfluencerSummary);
influencersRouter.post("/", authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] }), createInfluencerHandler);
influencersRouter.get("/:id", authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] }), getInfluencer);
influencersRouter.put("/:id", authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] }), updateInfluencerHandler);
influencersRouter.delete("/:id", authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] }), deleteInfluencerHandler);

// Notes History
influencersRouter.get("/:id/notes", authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] }), getNotesHandler);
influencersRouter.post("/:id/notes", authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] }), addNoteHandler);

// Goals
influencersRouter.get("/:id/goals", authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] }), getInfluencerGoalsHandler);
