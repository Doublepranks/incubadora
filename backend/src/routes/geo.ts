import { Router } from "express";
import { getStates, getCities } from "../controllers/geoController";
import { authorize } from "../middlewares/authorize";
import { requireAuth } from "../middlewares/requireAuth";

export const geoRouter = Router();

geoRouter.use(requireAuth);
geoRouter.get("/states", authorize({ roles: ["admin_global", "admin_regional", "admin_estadual"] }), getStates);
geoRouter.get("/cities", authorize({ roles: ["admin_global", "admin_regional", "admin_estadual"] }), getCities);
