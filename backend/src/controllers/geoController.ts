import { Request, Response } from "express";
import { listStates, listCities } from "../services/influencerService";

export async function getStates(_req: Request, res: Response) {
  const states = await listStates();
  return res.json({ error: false, data: states });
}

export async function getCities(req: Request, res: Response) {
  const { state } = req.query;
  const cities = await listCities(state as string | undefined);
  return res.json({ error: false, data: cities });
}
