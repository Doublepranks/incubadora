import { Router } from "express";
import { getInfluencers, getInfluencer } from "../controllers/influencerController";

export const influencersRouter = Router();

influencersRouter.get("/", getInfluencers);
influencersRouter.get("/:id", getInfluencer);
