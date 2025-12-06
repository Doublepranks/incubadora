import { Router } from "express";
import { runSync } from "../controllers/syncController";

export const syncRouter = Router();

syncRouter.post("/run", runSync);
