import statesAndCitiesDefault from "brazilian-cities/dist/states-and-cities";

export function listCitiesByStateUF(uf?: string): string[] {
  if (!uf) return [];
  const upper = uf.toUpperCase();
  const list = Array.isArray(statesAndCitiesDefault) ? statesAndCitiesDefault : (statesAndCitiesDefault as any).default;
  const state = list?.find((s: any) => s.cod?.toUpperCase() === upper || s.label?.toUpperCase() === upper);
  if (!state) return [];
  return state.cities.map((c) => c.label).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
