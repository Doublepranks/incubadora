import { Request, Response } from "express";
import { comparePassword, generateToken, mapUserToAuth } from "../services/authService";
import { findUserByEmail, findUserById } from "../repositories/userRepository";
import { env } from "../config/env";
import { SESSION_COOKIE } from "../middlewares/requireAuth";

const cookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSecure ? "none" as const : "lax" as const,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  path: "/",
};

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({
      error: true,
      message: "Email and password are required",
    });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: true, message: "Invalid credentials" });
  }

  const passwordOk = await comparePassword(password, user.passwordHash);
  if (!passwordOk) {
    return res.status(401).json({ error: true, message: "Invalid credentials" });
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  res.cookie(SESSION_COOKIE, token, cookieOptions);
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
    res.clearCookie(SESSION_COOKIE);
    return res.json({ error: false, user: null });
  }

  return res.json({
    error: false,
    user: mapUserToAuth({ ...user, regions: user.regions?.map((r) => r.uf) }),
  });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  return res.json({ error: false, message: "Logged out" });
}
