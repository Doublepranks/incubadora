import { Request, Response } from "express";
import {
  comparePassword,
  generateToken,
  generateRefreshToken,
  saveRefreshToken,
  deleteRefreshToken,
  findRefreshToken,
  rotateRefreshToken,
  mapUserToAuth,
} from "../services/authService";
import { findUserByEmail, findUserById } from "../repositories/userRepository";
import {
  SESSION_COOKIE,
  REFRESH_COOKIE,
  sessionCookieOptions,
  refreshCookieOptions,
} from "../middlewares/requireAuth";
import { logActivity, logSystem } from "../services/logService";
import { LogLevel } from "@prisma/client";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await findUserByEmail(email);
  if (!user) {
    await logSystem({
      level: LogLevel.warn,
      message: "Tentativa de login falhou: usuário não encontrado",
      meta: { email, ip: req.ip },
    });
    return res.status(401).json({ error: true, message: "Invalid credentials" });
  }

  const passwordOk = await comparePassword(password, user.passwordHash);
  if (!passwordOk) {
    await logSystem({
      level: LogLevel.warn,
      message: "Tentativa de login falhou: senha inválida",
      meta: { email, ip: req.ip, userId: user.id },
    });
    return res.status(401).json({ error: true, message: "Invalid credentials" });
  }

  // Gerar access token (JWT curto, 15min)
  const accessToken = generateToken({ id: user.id, role: user.role });

  // Gerar e salvar refresh token (opaco, 7 dias)
  const refreshToken = generateRefreshToken();
  await saveRefreshToken(
    refreshToken,
    user.id,
    req.headers["user-agent"],
    req.ip,
  );

  // Enviar como 2 cookies separados
  res.cookie(SESSION_COOKIE, accessToken, sessionCookieOptions);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);

  await logActivity({
    userId: user.id,
    message: "Login bem-sucedido",
    meta: { ip: req.ip, userAgent: req.headers["user-agent"] },
  });

  return res.json({
    error: false,
    user: mapUserToAuth({ ...user, regions: user.regions?.map((r) => r.uf) }),
  });
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    return res.json({ error: false, user: null });
  }

  const user = await findUserById(req.user.id);
  if (!user) {
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.clearCookie(REFRESH_COOKIE, { path: "/" });
    return res.json({ error: false, user: null });
  }

  return res.json({
    error: false,
    user: mapUserToAuth({ ...user, regions: user.regions?.map((r) => r.uf) }),
  });
}

export async function logout(req: Request, res: Response) {
  // Invalidar refresh token no banco
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (refreshToken) {
    await deleteRefreshToken(refreshToken);
  }

  // Limpar ambos os cookies
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: "/" });

  return res.json({ error: false, message: "Logged out" });
}

/**
 * Endpoint explícito de refresh — fallback para quando o refresh silencioso
 * no middleware não cobre (ex: frontend recebe 401 e tenta manualmente).
 */
export async function refresh(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) {
    return res.status(401).json({ error: true, message: "No refresh token" });
  }

  const record = await findRefreshToken(refreshToken);
  if (!record) {
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.clearCookie(REFRESH_COOKIE, { path: "/" });
    return res.status(401).json({ error: true, message: "Invalid refresh token" });
  }

  // Buscar user para obter role atualizado
  const user = await findUserById(record.userId);
  if (!user) {
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.clearCookie(REFRESH_COOKIE, { path: "/" });
    return res.status(401).json({ error: true, message: "User not found" });
  }

  // Rotacionar
  const rotated = await rotateRefreshToken(
    refreshToken,
    record.userId,
    req.headers["user-agent"],
    req.ip,
  );

  if (!rotated) {
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.clearCookie(REFRESH_COOKIE, { path: "/" });
    return res.status(401).json({ error: true, message: "Token already used" });
  }

  // Novo access token COM role
  const newAccessToken = generateToken({ id: user.id, role: user.role });

  res.cookie(SESSION_COOKIE, newAccessToken, sessionCookieOptions);
  res.cookie(REFRESH_COOKIE, rotated.newToken, refreshCookieOptions);

  return res.json({ error: false, message: "Token refreshed" });
}
