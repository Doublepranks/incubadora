import bcrypt from "bcryptjs";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import { AuthUser } from "../types/auth";
import { prisma } from "../config/prisma";

// ── Access Token (JWT) ───────────────────────────────────────────

export type AccessTokenPayload = {
  id: number;
  role?: string | null;
};

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: AccessTokenPayload): string {
  return jwt.sign(
    { id: user.id, role: user.role },
    env.authSecret,
    { expiresIn: env.accessTokenExpiration as jwt.SignOptions["expiresIn"] },
  );
}

/**
 * Verifica um access token JWT.
 * Retorna { payload } em caso de sucesso, { expired: true, payload } se expirado,
 * ou { payload: null } se inválido.
 */
export function verifyToken(token: string): {
  payload: AccessTokenPayload | null;
  expired: boolean;
} {
  try {
    const payload = jwt.verify(token, env.authSecret) as AccessTokenPayload;
    return { payload, expired: false };
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      // Decode without verification to get the payload for logging/context
      const payload = jwt.decode(token) as AccessTokenPayload | null;
      return { payload, expired: true };
    }
    return { payload: null, expired: false };
  }
}

/**
 * Converte um payload minimizado (id, role) para AuthUser completo.
 * Quando o JWT tem apenas { id, role }, os controllers devem usar findUserById()
 * para obter os dados completos.
 */
export function mapPayloadToMinimalAuth(payload: AccessTokenPayload): AuthUser {
  return {
    id: payload.id,
    email: "",  // Not in JWT — controllers should fetch from DB when needed
    name: "",   // Not in JWT — controllers should fetch from DB when needed
    role: payload.role,
  };
}

/**
 * Mantém compatibilidade para mapear user completo do banco para AuthUser.
 */
export function mapUserToAuth(user: {
  id: number;
  email: string;
  name: string;
  role?: string | null;
  regions?: string[];
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    regions: user.regions,
  };
}

// ── Refresh Token (opaco, armazenado no banco) ──────────────────

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

export async function saveRefreshToken(
  token: string,
  userId: number,
  userAgent?: string,
  ip?: string,
) {
  const expiresAt = new Date(Date.now() + env.refreshTokenExpirationMs);
  return prisma.refreshToken.create({
    data: { token, userId, expiresAt, userAgent, ip },
  });
}

export async function findRefreshToken(token: string) {
  const record = await prisma.refreshToken.findUnique({ where: { token } });
  if (!record) return null;
  if (record.expiresAt < new Date()) {
    // Token expired — clean it up
    await prisma.refreshToken.delete({ where: { id: record.id } }).catch(() => { });
    return null;
  }
  return record;
}

/**
 * Rotação com proteção contra race condition.
 *
 * Quando o access token expira, o frontend pode disparar N requests simultâneas.
 * Todas tentam rotacionar o mesmo refresh token. Para evitar que a segunda+
 * requests falhem e limpem os cookies:
 *
 * 1. Tenta deletar o token antigo atomicamente.
 * 2. Se já foi deletado (race condition), busca o token mais recente do mesmo
 *    usuário criado nos últimos 30 segundos — esse é o token que a request
 *    vencedora acabou de criar.
 * 3. Se encontrar, reutiliza ele (não cria duplicata).
 */
export async function rotateRefreshToken(
  oldToken: string,
  userId: number,
  userAgent?: string,
  ip?: string,
): Promise<{ newToken: string; expiresAt: Date } | null> {
  const newToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.refreshTokenExpirationMs);

  try {
    // Tentar rotação atômica: delete old + create new
    const [, created] = await prisma.$transaction([
      prisma.refreshToken.delete({ where: { token: oldToken } }),
      prisma.refreshToken.create({
        data: { token: newToken, userId, expiresAt, userAgent, ip },
      }),
    ]);
    return { newToken: created.token, expiresAt: created.expiresAt };
  } catch {
    // Token antigo já foi deletado por outra request concorrente.
    // Buscar o token recente que a request vencedora acabou de criar.
    const gracePeriod = new Date(Date.now() - 30_000); // 30 segundos
    const recent = await prisma.refreshToken.findFirst({
      where: {
        userId,
        createdAt: { gte: gracePeriod },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recent) {
      // Reutilizar o token criado pela request vencedora
      return { newToken: recent.token, expiresAt: recent.expiresAt };
    }

    // Nenhum token recente — sessão realmente expirou
    return null;
  }
}

export async function deleteRefreshToken(token: string) {
  return prisma.refreshToken.delete({ where: { token } }).catch(() => { });
}

export async function deleteRefreshTokensByUser(userId: number) {
  return prisma.refreshToken.deleteMany({ where: { userId } });
}

export async function cleanupExpiredTokens() {
  return prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
