import { Request, Response } from "express";
import { listStates, listCities } from "../services/influencerService";
import { listCitiesByStateUF } from "../services/geoService";

export async function getStates(_req: Request, res: Response) {
  const states = await listStates();
  return res.json({ error: false, data: states });
}

export async function getCities(req: Request, res: Response) {
  const { state } = req.query;
  // Prefer lista oficial por UF; se não houver UF, retorna vazio para evitar lista inteira
  const uf = state as string | undefined;
  if (!uf) {
    return res.json({ error: false, data: [] });
  }
  const cities = listCitiesByStateUF(uf);
  // fallback para cidades existentes no banco, caso necessário
  if (cities.length === 0) {
    const dbCities = await listCities(uf);
    return res.json({ error: false, data: dbCities });
  }
  return res.json({ error: false, data: cities });
}
