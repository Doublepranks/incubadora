import { Router } from "express";
import { getStates, getCities } from "../controllers/geoController";

export const geoRouter = Router();

geoRouter.get("/states", getStates);
geoRouter.get("/cities", getCities);
