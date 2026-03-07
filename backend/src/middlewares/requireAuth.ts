import { Request, Response, NextFunction } from "express";
import {
  verifyToken,
  mapPayloadToMinimalAuth,
  findRefreshToken,
  rotateRefreshToken,
  generateToken,
} from "../services/authService";
import { findUserById } from "../repositories/userRepository";
import { env } from "../config/env";

const SESSION_COOKIE = "session";
const REFRESH_COOKIE = "refresh";

const sessionCookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSecure ? "none" as const : "lax" as const,
  maxAge: 4 * 60 * 60 * 1000, // 4 hours (synced with access token TTL)
  path: "/",
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSecure ? "none" as const : "lax" as const,
  maxAge: env.refreshTokenExpirationMs,
  path: "/",
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const accessToken = req.cookies?.[SESSION_COOKIE];

  // ── 1. Tentar access token ──────────────────────────────────────
  if (accessToken) {
    const { payload, expired } = verifyToken(accessToken);

    if (payload && !expired) {
      // Access token válido — prosseguir
      req.user = mapPayloadToMinimalAuth(payload);
      return next();
    }

    if (expired) {
      // Access token expirado — tentar refresh silencioso
      return handleSilentRefresh(req, res, next);
    }
  }

  // ── 2. Sem access token — tentar refresh silencioso ─────────────
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (refreshToken) {
    return handleSilentRefresh(req, res, next);
  }

  // ── 3. Nenhum token — 401 ───────────────────────────────────────
  return res.status(401).json({ error: true, message: "Unauthorized" });
}

async function handleSilentRefresh(req: Request, res: Response, next: NextFunction) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) {
    clearAuthCookies(res);
    return res.status(401).json({ error: true, message: "Session expired" });
  }

  const record = await findRefreshToken(refreshToken);
  if (!record) {
    clearAuthCookies(res);
    return res.status(401).json({ error: true, message: "Invalid session" });
  }

  // Buscar user no banco para obter role atualizado
  const user = await findUserById(record.userId);
  if (!user) {
    clearAuthCookies(res);
    return res.status(401).json({ error: true, message: "User not found" });
  }

  // Rotacionar refresh token (atômico)
  const rotated = await rotateRefreshToken(
    refreshToken,
    record.userId,
    req.headers["user-agent"],
    req.ip,
  );

  if (!rotated) {
    clearAuthCookies(res);
    return res.status(401).json({ error: true, message: "Session expired" });
  }

  // Gerar novo access token COM role
  const newAccessToken = generateToken({ id: user.id, role: user.role });

  // Setar novos cookies
  res.cookie(SESSION_COOKIE, newAccessToken, sessionCookieOptions);
  res.cookie(REFRESH_COOKIE, rotated.newToken, refreshCookieOptions);

  // Prosseguir com a request
  req.user = mapPayloadToMinimalAuth({ id: user.id, role: user.role });
  return next();
}

function clearAuthCookies(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: "/" });
}

/**
 * Mesmo que requireAuth, mas NÃO retorna 401 quando não há nenhum token.
 * Usado em rotas como /me que precisam funcionar tanto autenticado quanto não.
 * Se houver tokens mas forem inválidos, limpa os cookies e prossegue sem user.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const accessToken = req.cookies?.[SESSION_COOKIE];

  if (accessToken) {
    const { payload, expired } = verifyToken(accessToken);

    if (payload && !expired) {
      req.user = mapPayloadToMinimalAuth(payload);
      return next();
    }

    if (expired) {
      return handleOptionalRefresh(req, res, next);
    }
  }

  // Sem access token — verificar se tem refresh
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (refreshToken) {
    return handleOptionalRefresh(req, res, next);
  }

  // Nenhum token — prosseguir sem user (não é erro)
  return next();
}

async function handleOptionalRefresh(req: Request, res: Response, next: NextFunction) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) {
    clearAuthCookies(res);
    return next();
  }

  const record = await findRefreshToken(refreshToken);
  if (!record) {
    clearAuthCookies(res);
    return next();
  }

  // Buscar user no banco para obter role atualizado
  const user = await findUserById(record.userId);
  if (!user) {
    clearAuthCookies(res);
    return next();
  }

  const rotated = await rotateRefreshToken(
    refreshToken,
    record.userId,
    req.headers["user-agent"],
    req.ip,
  );

  if (!rotated) {
    clearAuthCookies(res);
    return next();
  }

  const newAccessToken = generateToken({ id: user.id, role: user.role });
  res.cookie(SESSION_COOKIE, newAccessToken, sessionCookieOptions);
  res.cookie(REFRESH_COOKIE, rotated.newToken, refreshCookieOptions);
  req.user = mapPayloadToMinimalAuth({ id: user.id, role: user.role });
  return next();
}

export { SESSION_COOKIE, REFRESH_COOKIE, sessionCookieOptions, refreshCookieOptions };
