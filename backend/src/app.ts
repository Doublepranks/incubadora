import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { routes } from "./routes";

export const app = express();

// ── Security headers ──────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    frameguard: { action: "deny" },
    hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
    noSniff: true,
    // hidePoweredBy is enabled by default in helmet
  }),
);

// ── CORS ──────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

// ── Rate limiting ─────────────────────────────────────────────────
// Auth-specific: strict limit for brute-force protection on login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per window
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: "Muitas tentativas de login. Tente novamente em 15 minutos." },
});

// General API: relaxed limit (SPA makes ~10 requests per page load)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: "Muitas requisições. Tente novamente mais tarde." },
});

app.use("/api/auth/login", authLimiter);
app.use("/api", apiLimiter);

app.use("/api", routes);
