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
import { validate } from "../middlewares/validate";
import { createInfluencerSchema, updateInfluencerSchema } from "../schemas/influencer";
import { addNoteSchema } from "../schemas/note";

export const influencersRouter = Router();

const allAdmins = authorize({ roles: ["admin_global", "system_admin", "admin_regional", "admin_estadual"] });

influencersRouter.use(requireAuth);
influencersRouter.get("/", allAdmins, getInfluencers);
influencersRouter.get("/summary", allAdmins, getInfluencerSummary);
influencersRouter.post("/", allAdmins, validate(createInfluencerSchema), createInfluencerHandler);
influencersRouter.get("/:id", allAdmins, getInfluencer);
influencersRouter.put("/:id", allAdmins, validate(updateInfluencerSchema), updateInfluencerHandler);
influencersRouter.delete("/:id", allAdmins, deleteInfluencerHandler);

// Notes History
influencersRouter.get("/:id/notes", allAdmins, getNotesHandler);
influencersRouter.post("/:id/notes", allAdmins, validate(addNoteSchema), addNoteHandler);

// Goals
influencersRouter.get("/:id/goals", allAdmins, getInfluencerGoalsHandler);

