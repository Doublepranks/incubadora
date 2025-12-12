import { LogLevel, LogType, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

type LogMeta = Prisma.InputJsonValue | null | undefined;

type LogParams = {
  message: string;
  level?: LogLevel;
  meta?: LogMeta;
  userId?: number | null;
};

type ListLogsParams = {
  type?: LogType;
  level?: LogLevel;
  search?: string;
  cursor?: number;
  limit?: number;
};

export async function logSystem(params: LogParams) {
  const payload = {
    type: LogType.system,
    level: params.level ?? LogLevel.info,
    message: params.message,
    meta: params.meta === undefined ? undefined : params.meta === null ? Prisma.JsonNull : params.meta,
    userId: params.userId ?? null,
  };

  try {
    return await prisma.logEntry.create({ data: payload });
  } catch (err) {
    // Logging should never break primary flow
    console.error("[logSystem] failed", err);
    return null;
  }
}

export async function logActivity(params: LogParams & { userId?: number | null }) {
  const payload = {
    type: LogType.activity,
    level: params.level ?? LogLevel.info,
    message: params.message,
    meta: params.meta === undefined ? undefined : params.meta === null ? Prisma.JsonNull : params.meta,
    userId: params.userId ?? null,
  };

  try {
    return await prisma.logEntry.create({ data: payload });
  } catch (err) {
    console.error("[logActivity] failed", err);
    return null;
  }
}

export async function listLogs(params: ListLogsParams) {
  const { type, level, search, cursor, limit = 50 } = params;
  const where: any = {};

  if (type) where.type = type;
  if (level) where.level = level;
  if (search) {
    where.message = { contains: search, mode: "insensitive" };
  }

  const logs = await prisma.logEntry.findMany({
    where,
    orderBy: { id: "desc" },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasNext = logs.length > limit;
  const items = hasNext ? logs.slice(0, limit) : logs;
  const nextCursor = hasNext ? items[items.length - 1].id : null;

  return { items, nextCursor };
}
