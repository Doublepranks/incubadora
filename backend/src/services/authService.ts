import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthUser } from "../types/auth";

const TOKEN_EXPIRATION = "7d";

export type AuthTokenPayload = {
  id: number;
  email: string;
  name: string;
  role?: string | null;
  regions?: string[];
};

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: AuthTokenPayload): string {
  return jwt.sign(user, env.authSecret, { expiresIn: TOKEN_EXPIRATION });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, env.authSecret) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function mapUserToAuth(user: AuthTokenPayload): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    regions: user.regions,
  };
}
