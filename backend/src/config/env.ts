import dotenv from "dotenv";
import { resolve } from "path";

// Load env from repo root (../../../.env from src/config or dist/config)
dotenv.config({ path: resolve(__dirname, "../../../.env") });
// Fallback: load .env from backend folder (useful in CI/containers)
dotenv.config({ path: resolve(__dirname, "../../.env") });
// And finally default to cwd (no harm if already loaded)
dotenv.config();

const number = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: number(process.env.PORT, 3000),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:4173",
  databaseUrl: process.env.DATABASE_URL ?? "",
  authSecret: process.env.AUTH_SECRET ?? "dev-insecure-secret",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  apifyToken: process.env.APIFY_TOKEN ?? "",
};

if (!env.databaseUrl) {
  console.warn("DATABASE_URL is not set. Prisma queries will fail until it is provided.");
}
if (!process.env.AUTH_SECRET) {
  console.warn("AUTH_SECRET is not set. Using a dev fallback; set a strong secret for any real environment.");
}
