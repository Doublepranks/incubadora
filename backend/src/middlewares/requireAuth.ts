import { Request, Response, NextFunction } from "express";
import { verifyToken, mapUserToAuth } from "../services/authService";

const SESSION_COOKIE = "session";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({
      error: true,
      message: "Unauthorized",
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.clearCookie(SESSION_COOKIE);
    return res.status(401).json({
      error: true,
      message: "Invalid session",
    });
  }

  req.user = mapUserToAuth(payload);
  return next();
}

export { SESSION_COOKIE };
