import { LogLevel, LogType } from "@prisma/client";
import { Request, Response } from "express";
import { listLogs, logActivity, logSystem } from "../services/logService";
import { retryFailedSyncs, syncAllProfiles } from "../services/syncService";

export async function triggerSyncNow(req: Request, res: Response) {
  const userId = req.user?.id ?? null;
  await logActivity({
    userId,
    message: "Disparou coleta manual agora",
    meta: { ip: req.ip, userAgent: req.headers["user-agent"] },
  });

  try {
    const result = await syncAllProfiles();
    await logSystem({
      level: LogLevel.info,
      message: "Coleta manual concluída",
      meta: { userId, ...result },
    });
    return res.json({ error: false, ...result });
  } catch (err) {
    await logSystem({
      level: LogLevel.error,
      message: "Coleta manual falhou",
      meta: { userId, error: err instanceof Error ? err.message : "Unknown error" },
    });
    return res.status(500).json({
      error: true,
      message: "Falha ao disparar coleta manual",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export async function triggerRetryNow(req: Request, res: Response) {
  const userId = req.user?.id ?? null;
  const profileIds = Array.isArray(req.body?.profileIds) ? req.body.profileIds : undefined;

  await logActivity({
    userId,
    message: "Disparou retry manual agora",
    meta: { ip: req.ip, userAgent: req.headers["user-agent"], profileIds },
  });

  try {
    const result = await retryFailedSyncs({ profileIds });
    await logSystem({
      level: LogLevel.info,
      message: "Retry manual concluído",
      meta: { userId, ...result },
    });
    return res.json({ error: false, ...result });
  } catch (err) {
    await logSystem({
      level: LogLevel.error,
      message: "Retry manual falhou",
      meta: { userId, error: err instanceof Error ? err.message : "Unknown error" },
    });
    return res.status(500).json({
      error: true,
      message: "Falha ao disparar retry manual",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export async function getLogs(req: Request, res: Response) {
  const typeParam = typeof req.query.type === "string" ? req.query.type.toLowerCase() : undefined;
  const levelParam = typeof req.query.level === "string" ? req.query.level.toLowerCase() : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const cursorParam = typeof req.query.cursor === "string" ? Number(req.query.cursor) : undefined;
  const limitParam = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;

  const type = typeParam && typeParam in LogType ? (typeParam as LogType) : undefined;
  const level = levelParam && levelParam in LogLevel ? (levelParam as LogLevel) : undefined;
  const cursor = Number.isFinite(cursorParam) ? cursorParam : undefined;
  const limit = Number.isFinite(limitParam) ? Math.min(limitParam!, 200) : undefined;

  const { items, nextCursor } = await listLogs({ type, level, search, cursor, limit });
  return res.json({ error: false, data: items, nextCursor });
}
